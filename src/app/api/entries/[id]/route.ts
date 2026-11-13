import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import {
  error,
  jsonObject,
  ok,
  txt,
  positiveInt,
  decimal,
  dateValue,
} from "@/lib/api";
import { validateEntry } from "@/lib/metrics";
import { IssueStatus, Prisma } from "@/generated/prisma/client";
import {
  BASELINE_NOTE,
  CORRECTION_NOTE,
  ensureBaseline,
  lockVehicle,
  recalculateMileage,
  closeSupersededPlans,
} from "@/lib/vehicle-events";
import { runReminders } from "@/lib/reminders";
import { entryMoney } from "@/lib/entry-money";
import { isCurrency } from "@/lib/currency";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const id = (await params).id;
  const found = await db.vehicleEvent.findFirst({
    where: { id, vehicle: { ownerId: user.id } },
  });
  if (!found) return error("Opération introuvable", 404);
  const b = await jsonObject(request);
  if (!b) return error("JSON invalide");
  const protectedReading =
    found.kind === "ODOMETER" &&
    (found.notes?.startsWith(BASELINE_NOTE) ||
      found.notes?.startsWith(CORRECTION_NOTE));
  if (protectedReading) {
    if (Object.keys(b).some((key) => !["mileage", "occurredAt"].includes(key)))
      return error("Ce relevé accepte uniquement le kilométrage et la date.");
    const requestedMileage =
      "mileage" in b ? positiveInt(b.mileage) : undefined;
    const requestedDate =
      "occurredAt" in b ? dateValue(b.occurredAt) : undefined;
    if (requestedMileage === null || requestedDate === null)
      return error("Kilométrage ou date invalide");
    const entry = await db.$transaction(async (tx) => {
      await lockVehicle(tx, found.vehicleId);
      const previous = await tx.vehicleEvent.findUniqueOrThrow({
        where: { id },
      });
      const mileage = requestedMileage ?? previous.mileage!,
        occurredAt = requestedDate ?? previous.occurredAt;
      const audit = `Modification du relevé le ${new Date().toISOString()} : ${previous.mileage} km (${previous.occurredAt.toISOString()}) → ${mileage} km (${occurredAt.toISOString()}).`;
      const updated = await tx.vehicleEvent.update({
        where: { id },
        data: { mileage, occurredAt, notes: `${previous.notes}\n${audit}` },
      });
      await recalculateMileage(tx, found.vehicleId);
      return updated;
    });
    await runReminders({ vehicleId: found.vehicleId }).catch((e) =>
      console.error("Reminders after odometer correction", e),
    );
    return ok({ entry });
  }
  if ("kind" in b && b.kind !== found.kind)
    return error("Le type d’opération ne peut pas changer.");
  const data: Prisma.VehicleEventUpdateInput = {};
  if ("status" in b) {
    if (
      !["OPEN", "IN_PROGRESS", "RESOLVED"].includes(String(b.status)) ||
      (!["ISSUE", "MAINTENANCE", "OIL_CHANGE", "REPAIR"].includes(found.kind) &&
        b.status !== "RESOLVED")
    )
      return error("Statut invalide");
    data.status = b.status as IssueStatus;
  }
  if ("notes" in b) {
    data.notes = txt(b.notes, 4000) || null;
    if (data.notes?.startsWith("[carvizo:"))
      return error("Préfixe de note réservé");
  }
  if ("title" in b) {
    data.title = txt(b.title, 180);
    if (!data.title) return error("Titre obligatoire");
  }
  for (const key of ["mileage", "nextDueKm"] as const) {
    if (key in b) {
      const value =
        b[key] == null || b[key] === "" ? null : positiveInt(b[key]);
      if (b[key] != null && b[key] !== "" && value === null)
        return error("Kilométrage invalide");
      data[key] = value;
    }
  }
  for (const key of ["occurredAt", "nextDueAt"] as const) {
    if (key in b) {
      const value = dateValue(b[key]);
      if ((key === "occurredAt" || (b[key] != null && b[key] !== "")) && !value)
        return error("Date invalide");
      if (key === "occurredAt") data.occurredAt = value!;
      else data.nextDueAt = value;
    }
  }
  if ("amount" in b || "currency" in b) {
    const money = entryMoney(
      b,
      isCurrency(found.currency) ? found.currency : "EUR",
    );
    if ("error" in money) return error(money.error!);
    if (
      "currency" in b &&
      money.currency !== found.currency &&
      !("amount" in b) &&
      found.amountCents !== null
    )
      return error("Renseigne le montant dans la nouvelle devise.");
    data.currency = money.currency;
    if ("amountCents" in money) data.amountCents = money.amountCents;
  }
  if ("liters" in b) {
    const liters =
      b.liters == null || b.liters === "" ? null : decimal(b.liters);
    if (b.liters != null && b.liters !== "" && liters === null)
      return error("Volume invalide");
    data.volumeMl = liters === null ? null : Math.round(liters * 1000);
  }
  if ("fullTank" in b) {
    if (typeof b.fullTank !== "boolean") return error("Plein invalide");
    data.fullTank = b.fullTank;
  }
  const message = validateEntry({
    kind: found.kind,
    title: typeof data.title === "string" ? data.title : found.title,
    mileage:
      "mileage" in data ? (data.mileage as number | null) : found.mileage,
    volumeMl:
      "volumeMl" in data ? (data.volumeMl as number | null) : found.volumeMl,
    amountCents:
      "amountCents" in data
        ? (data.amountCents as number | null)
        : found.amountCents,
  });
  if (message) return error(message);
  const entry = await db.$transaction(async (tx) => {
    const vehicle = await lockVehicle(tx, found.vehicleId);
    await ensureBaseline(tx, vehicle);
    const updated = await tx.vehicleEvent.update({ where: { id }, data });
    if (
      updated.status === "RESOLVED" &&
      (updated.kind === "MAINTENANCE" || updated.kind === "OIL_CHANGE")
    )
      await closeSupersededPlans(tx, { ...updated, kind: updated.kind });
    await recalculateMileage(tx, found.vehicleId);
    return updated;
  });
  await runReminders({ vehicleId: found.vehicleId }).catch((e) =>
    console.error("Reminders after entry correction", e),
  );
  return ok({ entry });
}
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return error("Connexion requise", 401);
  const id = (await params).id;
  const found = await db.vehicleEvent.findFirst({
    where: { id, vehicle: { ownerId: user.id } },
    include: { photos: { select: { storageKey: true } } },
  });
  if (!found) return error("Opération introuvable", 404);
  if (
    found.notes?.startsWith(BASELINE_NOTE) ||
    found.notes?.startsWith(CORRECTION_NOTE)
  )
    return error(
      "Le relevé initial et les corrections sont conservés. Modifie leur kilométrage ou leur date.",
    );
  await db.$transaction(async (tx) => {
    const vehicle = await lockVehicle(tx, found.vehicleId);
    await ensureBaseline(tx, vehicle);
    await tx.vehicleEvent.delete({ where: { id } });
    await recalculateMileage(tx, found.vehicleId);
  });
  const { removePhoto } = await import("@/lib/photos");
  await Promise.allSettled(found.photos.map((p) => removePhoto(p.storageKey)));
  return ok({ success: true });
}
