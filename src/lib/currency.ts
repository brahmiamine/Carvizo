export type Currency = "EUR" | "TND";
export const currencies: readonly Currency[] = ["EUR", "TND"];
export function isCurrency(value: unknown): value is Currency {
  return value === "EUR" || value === "TND";
}
export function currencyDigits(currency: string): number {
  if (!isCurrency(currency)) throw new RangeError("Devise non prise en charge");
  return currency === "TND" ? 3 : 2;
}
/** Legacy amountCents fields store minor units: EUR cents, TND millimes. */
export function toMinor(amount: number, currency: string): number | null {
  const digits = currencyDigits(currency);
  if (!Number.isFinite(amount) || amount < 0) return null;
  // Shift the decimal exponent before rounding to avoid 1.005 * 100 artifacts.
  const [coefficient, exponent = "0"] = amount.toString().split("e");
  const minor = Math.round(
    Number(`${coefficient}e${Number(exponent) + digits}`),
  );
  return Number.isSafeInteger(minor) && minor <= 2_147_483_647 ? minor : null;
}
export function fromMinor(minor: number, currency: string): number {
  return minor / 10 ** currencyDigits(currency);
}
export function formatMoney(
  minor: number,
  currency: string,
  locale = "fr-FR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: currencyDigits(currency),
    maximumFractionDigits: currencyDigits(currency),
  }).format(fromMinor(minor, currency));
}
export function decimalMoney(minor: number, currency: string): string {
  return fromMinor(minor, currency).toFixed(currencyDigits(currency));
}
