import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { error, jsonObject, ok, txt, decimal, positiveInt } from "@/lib/api";
import { Prisma } from "@/generated/prisma/client";
import {
  CORRECTION_NOTE,
  ensureBaseline,
  lockVehicle,
} from "@/lib/vehicle-events";
import { runReminders } from "@/lib/reminders";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const vehicle = await db.vehicle.findFirst({
    where: { id: (await params).id, ownerId: user.id },
    include: {
      photos: {
        where: { eventId: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return vehicle ? ok({ vehicle }) : error("Véhicule introuvable", 404);
}
export async function PATCH(request: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const id = (await params).id;
  const vehicle = await db.vehicle.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!vehicle) return error("Véhicule introuvable", 404);
  const b = await jsonObject(request);
  if (!b) return error("JSON invalide");
  const data: Prisma.VehicleUpdateInput = {};
  for (const key of ["make", "model", "fuelType"] as const) {
    if (key in b) {
      const value = txt(b[key], key === "fuelType" ? 32 : 80);
      if (!value) return error("Marque, modèle et carburant obligatoires");
      data[key] = value;
    }
  }
  if ("year" in b) {
    const value = b.year == null ? null : positiveInt(b.year);
    if (
      b.year != null &&
      (value === null || value < 1886 || value > new Date().getFullYear() + 1)
    )
      return error("Année invalide");
    data.year = value;
  }
  const correction = "currentKm" in b ? positiveInt(b.currentKm) : undefined;
  if (correction === null) return error("Kilométrage invalide");
  if ("name" in b) data.name = txt(b.name, 100) || null;
  if ("registration" in b) data.registration = txt(b.registration, 32) || null;
  for (const k of ["frontPressureBar", "rearPressureBar"] as const) {
    if (k in b) {
      const value = b[k] == null ? null : decimal(b[k]);
      if (b[k] != null && (value === null || value < 0.5 || value > 6))
        return error("Pression invalide");
      data[k] = value;
    }
  }
  const updated = await db.$transaction(async (tx) => {
    const locked = await lockVehicle(tx, id);
    if (correction !== undefined && correction !== locked.currentKm) {
      await ensureBaseline(tx, locked);
      await tx.vehicleEvent.create({
        data: {
          vehicleId: id,
          kind: "ODOMETER",
          title: "Correction du compteur",
          notes: `${CORRECTION_NOTE} ${locked.currentKm} → ${correction} km`,
          mileage: correction,
        },
      });
      data.currentKm = correction;
      data.lastOdometerAt = new Date();
    }
    return tx.vehicle.update({ where: { id }, data });
  });
  await runReminders({ vehicleId: id }).catch((e) =>
    console.error("Reminders after vehicle update", e),
  );
  return ok({ vehicle: updated });
}
export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const id = (await params).id;
  const found = await db.vehicle.findFirst({ where: { id, ownerId: user.id } });
  if (!found) return error("Véhicule introuvable", 404);
  // Les fichiers privés sont purgés après la suppression.
  const photos = await db.photo.findMany({
    where: { vehicleId: id },
    select: { storageKey: true },
  });
  await db.vehicle.delete({ where: { id } });
  const { removePhoto } = await import("@/lib/photos");
  await Promise.allSettled(photos.map((p) => removePhoto(p.storageKey)));
  return ok({ success: true });
}
