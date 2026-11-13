import type { Currency } from "@/lib/currency";
export type Kind =
  | "MAINTENANCE"
  | "OIL_CHANGE"
  | "FUEL"
  | "ODOMETER"
  | "TIRE"
  | "REPAIR"
  | "ISSUE"
  | "EXPENSE";
export type User = {
  id: string;
  name: string;
  email: string;
  currency: Currency;
};
export type Photo = { id: string; mime: string };
export type Vehicle = {
  id: string;
  make: string;
  model: string;
  name: string | null;
  year: number | null;
  registration: string | null;
  fuelType: string;
  currentKm: number;
  lastOdometerAt: string | null;
  frontPressureBar: number | null;
  rearPressureBar: number | null;
  photos?: Photo[];
  _count?: { events: number; photos: number };
};
export type Entry = {
  id: string;
  vehicleId: string;
  kind: Kind;
  title: string;
  notes: string | null;
  occurredAt: string;
  mileage: number | null;
  amountCents: number | null;
  currency: Currency;
  volumeMl: number | null;
  fullTank: boolean;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  nextDueKm: number | null;
  nextDueAt: string | null;
  photos: Photo[];
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};
export type Tab =
  "accueil" | "garage" | "suivi" | "vidange" | "rappels" | "profil";
export type CurrencyTotals = Partial<
  Record<Currency, { spentCents: number; monthlyCents: number }>
>;
export type EntryMeta = {
  nextCursor: string | null;
  totals: {
    spentCents: number;
    monthlyCents: number;
    byCurrency?: CurrencyTotals;
  };
  latestOil: Entry | null;
  fuelEntries: Pick<
    Entry,
    "mileage" | "volumeMl" | "fullTank" | "occurredAt"
  >[];
  activePlans: Entry[];
};
