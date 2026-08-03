import type { Currency } from "@/lib/currency";

/**
 * Money is integer minor units end to end (docs/Tech.md §7). Nothing in this
 * module hands back a float amount; the only floats that appear are transient
 * intermediates inside a single rounding expression.
 *
 * Two conversions live here and nowhere else:
 *
 *   "1 234,50"  →  123450 cents      (what the user types)
 *   "21.5"      →  2150 basis points (what a VAT rate becomes)
 */

/** Quantity is `numeric(12,2)`, so two decimals is the exact storage precision. */
export const QUANTITY_DECIMALS = 2;

const AMOUNT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const QUANTITY_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const PERCENT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

/**
 * Strips grouping so a pasted "1 234,50" or "1,234.50" survives. The last
 * separator in the string is the decimal point; anything before it is grouping.
 */
function normaliseNumeric(input: string): string {
  const trimmed = input.trim().replace(/\s| |'/g, "");

  if (trimmed.length === 0) {
    return "";
  }

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);

  if (decimalAt === -1) {
    return trimmed;
  }

  const whole = trimmed.slice(0, decimalAt).replace(/[.,]/g, "");
  const fraction = trimmed.slice(decimalAt + 1);

  return `${whole}.${fraction}`;
}

/**
 * `null` means "not a valid amount" — callers turn that into a field error.
 * Parsing digit-wise rather than through `Number` keeps 0.1-style binary error
 * out of the cent value entirely.
 */
export function parseAmountToCents(input: string): number | null {
  const normalised = normaliseNumeric(input);

  if (!AMOUNT_PATTERN.test(normalised)) {
    return null;
  }

  const [whole, fraction = ""] = normalised.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}

/** Quantity as hundredths, which is how the totals mirror multiplies it. */
export function parseQuantityToHundredths(input: string): number | null {
  const normalised = normaliseNumeric(input);

  if (!QUANTITY_PATTERN.test(normalised)) {
    return null;
  }

  const [whole, fraction = ""] = normalised.split(".");
  const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(hundredths) ? hundredths : null;
}

/** A VAT percentage as integer basis points: 21.5 % → 2150 (docs/DB.md §4.5). */
export function parsePercentToBps(input: string): number | null {
  const normalised = normaliseNumeric(input);

  if (!PERCENT_PATTERN.test(normalised)) {
    return null;
  }

  const [whole, fraction = ""] = normalised.split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(bps) ? bps : null;
}

/** Cents back to the plain decimal string an input field expects. */
export function centsToAmountInput(cents: number): string {
  const safe = Math.trunc(Math.abs(cents));

  return `${Math.trunc(safe / 100)}.${String(safe % 100).padStart(2, "0")}`;
}

export function quantityToInput(quantity: number | string): string {
  const value = typeof quantity === "string" ? Number(quantity) : quantity;

  if (!Number.isFinite(value)) {
    return "1";
  }

  // Trailing zeros dropped: "8" reads better than "8.00" in a quantity box.
  return String(Number(value.toFixed(QUANTITY_DECIMALS)));
}

export function bpsToPercentInput(bps: number): string {
  return String(Number((bps / 100).toFixed(2)));
}

/**
 * Display formatting only — it never re-derives an amount (docs/Tech.md §7).
 * The locale is pinned to `en-US` so a server render and a client render of the
 * same invoice cannot disagree, and because the product is English-only.
 */
export function formatCents(cents: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(cents / 100);
}

/** The amount alone, for table columns that carry the currency in the header. */
export function formatCentsPlain(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercent(bps: number): string {
  return `${bpsToPercentInput(bps)} %`;
}

export function formatQuantity(
  quantity: number | string,
  unitType: "hours" | "flat",
): string {
  return unitType === "flat" ? "flat" : `${quantityToInput(quantity)} hrs`;
}
