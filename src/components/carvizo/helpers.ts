import {
  Bell,
  CarFront,
  ChartNoAxesCombined,
  Fuel,
  Wrench,
  Wallet,
  Gauge,
  Settings,
  AlertCircle,
  Wind,
  ClipboardList,
  Droplets,
} from "lucide-react";
import type { Entry, Kind, Tab } from "./types";
export const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export const date = (v: string | Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v));
export const kindLabels: Record<Kind, string> = {
  MAINTENANCE: "Entretien",
  OIL_CHANGE: "Vidange",
  FUEL: "Carburant",
  ODOMETER: "Compteur",
  TIRE: "Pneus",
  REPAIR: "Réparation",
  ISSUE: "Problème",
  EXPENSE: "Dépense",
};
export const icons = {
  MAINTENANCE: Wrench,
  OIL_CHANGE: Droplets,
  FUEL: Fuel,
  ODOMETER: Gauge,
  TIRE: Wind,
  REPAIR: Settings,
  ISSUE: AlertCircle,
  EXPENSE: Wallet,
};
export const items: { id: Tab; label: string; icon: typeof Bell }[] = [
  { id: "accueil", label: "Accueil", icon: ChartNoAxesCombined },
  { id: "garage", label: "Mon garage", icon: CarFront },
  { id: "suivi", label: "Historique", icon: ClipboardList },
  { id: "vidange", label: "Vidange", icon: Droplets },
  { id: "rappels", label: "Rappels", icon: Bell },
  { id: "profil", label: "Mon compte", icon: Settings },
];

export async function api<T = Record<string, unknown>>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = { error: "Réponse invalide du serveur" };
  }
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Une erreur est survenue";
    throw new Error(message);
  }
  return data as T;
}

export function oilInterval(entries: Entry[]) {
  const last = entries.find(
    (e) => e.kind === "OIL_CHANGE" && e.status === "RESOLVED",
  );
  return last?.mileage != null &&
    last.nextDueKm != null &&
    last.nextDueKm > last.mileage
    ? last.nextDueKm - last.mileage
    : 10000;
}

export const isProtectedOdometer = (entry: Entry | null) =>
  Boolean(
    entry?.kind === "ODOMETER" &&
    (entry.notes?.startsWith("[carvizo:baseline]") ||
      entry.notes?.startsWith("[carvizo:odometer-correction]")),
  );
