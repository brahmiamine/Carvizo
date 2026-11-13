"use client";
import { useState } from "react";
import type { Currency } from "@/lib/currency";
import { formatMoney, fromMinor } from "@/lib/currency";
import { useCarvizo } from "./context";
import type { CurrencyTotals, Entry } from "./types";
import type { Theme } from "./use-preferences";
export function Preferences() {
  const { theme, setTheme, currency, updateCurrency } = useCarvizo();
  return (
    <section className="panel preferences-panel">
      <h2>Préférences</h2>
      <div className="form form-cols">
        <label>
          Thème
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option value="system">Système</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </label>
        <label>
          Devise préférée
          <select
            value={currency}
            onChange={(e) => updateCurrency(e.target.value as Currency)}
          >
            <option value="EUR">Euro (EUR)</option>
            <option value="TND">Dinar tunisien (TND)</option>
          </select>
        </label>
      </div>
      <p className="hint">
        La devise préférée s’applique aux nouvelles dépenses. Les opérations
        conservent leur devise d’origine.
      </p>
    </section>
  );
}
export function AmountInput({
  entry,
  defaultCurrency,
}: {
  entry: Entry | null;
  defaultCurrency: Currency;
}) {
  const [currency, setCurrency] = useState<Currency>(
    entry?.currency ?? defaultCurrency,
  );
  return (
    <div className="form-cols">
      <label>
        Montant ({currency})
        <input
          name="amount"
          defaultValue={
            entry?.amountCents != null
              ? fromMinor(entry.amountCents, entry.currency ?? "EUR")
              : ""
          }
          type="number"
          min="0"
          step={currency === "TND" ? "0.001" : "0.01"}
          placeholder={currency === "TND" ? "0.000" : "0.00"}
        />
      </label>
      <label>
        Devise
        <select
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
        >
          <option value="EUR">EUR · Euro</option>
          <option value="TND">TND · Dinar tunisien</option>
        </select>
      </label>
    </div>
  );
}
export function CurrencyTotalsView({
  totals,
  currency,
  field,
  fallback = 0,
}: {
  totals?: CurrencyTotals;
  currency: Currency;
  field: "spentCents" | "monthlyCents";
  fallback?: number;
}) {
  const currencies: Currency[] = totals
    ? (["EUR", "TND"] as const).filter(
        (c) => c === currency || Boolean(totals[c]?.[field]),
      )
    : [currency];
  return (
    <span className="currency-totals">
      {currencies.map((c) => (
        <span key={c}>
          {formatMoney(
            totals?.[c]?.[field] ?? (c === currency ? fallback : 0),
            c,
          )}
        </span>
      ))}
    </span>
  );
}
