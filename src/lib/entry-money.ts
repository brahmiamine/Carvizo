import { isCurrency, toMinor, type Currency } from "./currency.ts";

export function entryMoney(
  input: Record<string, unknown>,
  fallbackCurrency: Currency,
) {
  const currency =
    input.currency === undefined ? fallbackCurrency : input.currency;
  if (!isCurrency(currency)) return { error: "Devise invalide" } as const;
  if (!("amount" in input)) return { currency } as const;
  if (input.amount === null || input.amount === "")
    return { currency, amountCents: null } as const;
  if (
    typeof input.amount !== "number" ||
    !Number.isFinite(input.amount) ||
    input.amount < 0
  )
    return { error: "Montant invalide" } as const;
  const amountCents = toMinor(input.amount, currency);
  if (amountCents === null) return { error: "Montant hors limites" } as const;
  return { currency, amountCents } as const;
}
