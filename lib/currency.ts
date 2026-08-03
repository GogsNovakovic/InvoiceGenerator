/**
 * The supported currency list, mirroring the `check` constraint on
 * `profiles.default_currency` and `invoices.currency` (docs/DB.md §3).
 *
 * Adding one here without changing the constraint produces a runtime insert
 * failure, so the two lists have to move together.
 */
export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "BAM"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "EUR";

export function isCurrency(value: unknown): value is Currency {
  return (
    typeof value === "string" && CURRENCIES.includes(value as Currency)
  );
}

/** Falls back to EUR rather than throwing: a bad value must not blank a screen. */
export function toCurrency(value: unknown): Currency {
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}
