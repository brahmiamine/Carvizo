import { db } from "@/lib/db";
import { currentUser, verifyPassword, endSession } from "@/lib/auth";
import { error, jsonObject, ok } from "@/lib/api";
import { csvCell, escapeHtml } from "@/lib/export";
import { decimalMoney, isCurrency } from "@/lib/currency";
import { removePhoto } from "@/lib/photos";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const vehicles = await db.vehicle.findMany({
    where: { ownerId: user.id },
    include: {
      events: true,
      photos: {
        select: { id: true, eventId: true, mime: true, createdAt: true },
      },
    },
  });
  const format = new URL(request.url).searchParams.get("format");
  const rows = vehicles.flatMap((v) =>
    v.events.map((e) => [
      v.name || `${v.make} ${v.model}`,
      v.registration,
      e.kind,
      e.title,
      e.occurredAt.toISOString(),
      e.mileage,
      e.amountCents == null ? null : decimalMoney(e.amountCents, e.currency),
      e.currency,
      e.notes,
    ]),
  );
  const headings = [
    "Véhicule",
    "Immatriculation",
    "Type",
    "Titre",
    "Date",
    "Kilométrage",
    "Montant",
    "Devise",
    "Notes",
  ];
  if (format === "csv")
    return new Response(
      "\uFEFF" +
        [headings, ...rows]
          .map((row) => row.map(csvCell).join(";"))
          .join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="carvizo-export.csv"',
          "Cache-Control": "no-store",
        },
      },
    );
  if (format === "print")
    return new Response(
      `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Export Carvizo</title><style>body{font:14px Arial;margin:30px}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #ccc;text-align:left}@media print{button{display:none}}</style><h1>Carnet Carvizo — ${escapeHtml(user.name)}</h1><p>Utilisez Imprimer puis « Enregistrer au format PDF » dans votre navigateur.</p><button onclick="window.print()">Imprimer / PDF</button><table><thead><tr>${headings.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        },
      },
    );
  return new Response(
    JSON.stringify({ exportedAt: new Date().toISOString(), user, vehicles }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="carvizo-export.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const body = await jsonObject(request);
  if (!isCurrency(body?.currency)) return error("Choisis EUR ou TND.");
  const updated = await db.user.update({
    where: { id: user.id },
    data: { currency: body.currency },
    select: {
      id: true,
      name: true,
      email: true,
      currency: true,
      createdAt: true,
    },
  });
  return ok({ user: updated });
}
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const b = await jsonObject(request);
  if (typeof b?.password !== "string") return error("Mot de passe requis");
  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(b.password, record.passwordHash)))
    return error("Mot de passe incorrect", 403);
  const photos = await db.photo.findMany({
    where: { vehicle: { ownerId: user.id } },
    select: { storageKey: true },
  });
  await db.user.delete({ where: { id: user.id } });
  await Promise.allSettled(photos.map((p) => removePhoto(p.storageKey)));
  await endSession();
  return ok({ success: true });
}
