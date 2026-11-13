import { formatMoney, isCurrency } from "./currency.ts";
import type { Prisma } from "@/generated/prisma/client";

export const BASELINE_NOTE = "[carvizo:baseline]";
export const CORRECTION_NOTE = "[carvizo:odometer-correction]";
type MileageEvent = {
  mileage: number | null;
  notes: string | null;
  createdAt: Date;
  occurredAt: Date;
  kind: string;
  status?: string;
};

// Corrections start a new odometer history; earlier readings remain in the journal.
export function mileageFromHistory(events: MileageEvent[]): number {
  const actual = events.filter(
    (e) =>
      !e.notes?.startsWith("[carvizo:superseded]") &&
      (!["MAINTENANCE", "OIL_CHANGE", "REPAIR"].includes(e.kind) ||
        !e.status ||
        e.status === "RESOLVED"),
  );
  const correction = actual
    .filter((e) => e.notes?.startsWith(CORRECTION_NOTE))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return actual.reduce(
    (km, e) =>
      e.mileage !== null && (!correction || e.createdAt >= correction.createdAt)
        ? Math.max(km, e.mileage)
        : km,
    0,
  );
}
export async function lockVehicle(tx: Prisma.TransactionClient, id: string) {
  // This row lock serializes event edits, inserts, deletions and explicit corrections.
  await tx.$queryRawUnsafe(
    "SELECT id FROM Vehicle WHERE id = ? FOR UPDATE",
    id,
  );
  return tx.vehicle.findUniqueOrThrow({ where: { id } });
}
export async function ensureBaseline(
  tx: Prisma.TransactionClient,
  vehicle: { id: string; currentKm: number; createdAt: Date },
) {
  const baseline = await tx.vehicleEvent.findFirst({
    where: {
      vehicleId: vehicle.id,
      OR: [
        { notes: { startsWith: BASELINE_NOTE } },
        { notes: { startsWith: CORRECTION_NOTE } },
      ],
    },
    select: { id: true },
  });
  if (baseline) return;
  const readings = await tx.vehicleEvent.aggregate({
    where: { vehicleId: vehicle.id },
    _min: { mileage: true },
  });
  const mileage = Math.min(
    vehicle.currentKm,
    readings._min.mileage ?? vehicle.currentKm,
  );
  await tx.vehicleEvent.create({
    data: {
      vehicleId: vehicle.id,
      kind: "ODOMETER",
      title: "Kilométrage initial",
      notes: BASELINE_NOTE,
      mileage,
      occurredAt: vehicle.createdAt,
      createdAt: vehicle.createdAt,
    },
  });
}
export async function recalculateMileage(
  tx: Prisma.TransactionClient,
  vehicleId: string,
) {
  const events = await tx.vehicleEvent.findMany({
    where: { vehicleId },
    select: {
      mileage: true,
      notes: true,
      createdAt: true,
      occurredAt: true,
      kind: true,
      status: true,
    },
  });
  const last = events
    .filter((e) => e.kind === "ODOMETER" && !e.notes?.startsWith(BASELINE_NOTE))
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
  await tx.vehicle.update({
    where: { id: vehicleId },
    data: {
      currentKm: mileageFromHistory(events),
      lastOdometerAt: last?.occurredAt ?? null,
    },
  });
}

export const SUPERSEDED_NOTE = "[carvizo:superseded]";
export async function closeSupersededPlans(
  tx: Prisma.TransactionClient,
  entry: {
    id: string;
    vehicleId: string;
    kind: "MAINTENANCE" | "OIL_CHANGE";
    title: string;
  },
) {
  const plans = await tx.vehicleEvent.findMany({
    where: {
      vehicleId: entry.vehicleId,
      id: { not: entry.id },
      kind: entry.kind,
      title: entry.title,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });
  for (const plan of plans) {
    const estimate =
      plan.amountCents === null
        ? ""
        : ` Estimation conservée : ${formatMoney(plan.amountCents, isCurrency(plan.currency) ? plan.currency : "EUR")}.`;
    await tx.vehicleEvent.update({
      where: { id: plan.id },
      data: {
        status: "RESOLVED",
        amountCents: null,
        notes:
          `${SUPERSEDED_NOTE} Remplacé par l’opération terminée.${estimate}\n${plan.notes ?? ""}`.slice(
            0,
            4000,
          ),
      },
    });
  }
}
