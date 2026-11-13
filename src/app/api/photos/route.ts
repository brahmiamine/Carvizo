import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { error, ok } from "@/lib/api";
import { detectedMime, savePhoto, removePhoto } from "@/lib/photos";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Formulaire invalide");
  }
  const vehicleId = String(form.get("vehicleId") || ""),
    eventId = String(form.get("eventId") || "") || null;
  const file = form.get("file");
  if (!(file instanceof File)) return error("Image manquante");
  if (file.size > 5 * 1024 * 1024)
    return error("Image trop grande (5 Mo maximum)", 413);
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = detectedMime(bytes);
  if (!mime || (mime === "application/pdf" && !eventId))
    return error(
      "Format non accepté (JPEG, PNG, WebP ou facture PDF pour une opération)",
      415,
    );
  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, ownerId: user.id },
  });
  if (!vehicle) return error("Véhicule introuvable", 404);
  if (
    eventId &&
    !(await db.vehicleEvent.findFirst({ where: { id: eventId, vehicleId } }))
  )
    return error("Opération introuvable", 404);
  const existing = await db.photo.count({ where: { vehicleId, eventId } });
  const max = eventId ? 4 : 3;
  if (existing >= max)
    return error(
      "Limite de photos atteinte pour cette opération ou ce véhicule.",
      429,
    );
  const storageKey = await savePhoto(bytes, mime);
  try {
    const photo = await db.photo.create({
      data: { vehicleId, eventId, storageKey, mime },
    });
    return ok({ photo: { id: photo.id, mime: photo.mime } }, 201);
  } catch {
    await removePhoto(storageKey);
    return error("Enregistrement impossible", 500);
  }
}
