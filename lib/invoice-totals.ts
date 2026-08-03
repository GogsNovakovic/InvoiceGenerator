/**
 * A mirror of the database's arithmetic, existing for exactly one reason: the
 * invoice form has to show a live total while the user types, and the totals
 * that get *stored* come from generated columns and a trigger (docs/DB.md §6.3).
 *
 * If this file and the database ever disagree, the database is right and this
 * is the bug. Nothing here is ever written to a total column.
 *
 * The database computes:
 *
 *   line_subtotal = round(quantity × unit_price_cents)
 *   line_tax      = round(line_subtotal × vat_rate_bps / 10000)
 *   subtotal      = Σ line_subtotal      (already-rounded values)
 *   tax           = Σ line_tax
 */

import {
  parseAmountToCents,
  parsePercentToBps,
  parseQuantityToHundredths,
} from "@/lib/money";

export type TotalsInput = {
  /** Quantity in hundredths, so the multiplication stays in integers. */
  quantityHundredths: number;
  unitPriceCents: number;
  vatRateBps: number;
};

export type VatBreakdownRow = {
  vatRateBps: number;
  netCents: number;
  taxCents: number;
};

export type InvoiceTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  vatBreakdown: VatBreakdownRow[];
};

export function lineSubtotalCents(line: TotalsInput): number {
  return Math.round((line.quantityHundredths * line.unitPriceCents) / 100);
}

export function lineTaxCents(line: TotalsInput): number {
  return Math.round((lineSubtotalCents(line) * line.vatRateBps) / 10000);
}

export function calculateTotals(lines: TotalsInput[]): InvoiceTotals {
  const byRate = new Map<number, VatBreakdownRow>();
  let subtotalCents = 0;
  let taxCents = 0;

  for (const line of lines) {
    const net = lineSubtotalCents(line);
    const tax = lineTaxCents(line);

    subtotalCents += net;
    taxCents += tax;

    const row = byRate.get(line.vatRateBps) ?? {
      vatRateBps: line.vatRateBps,
      netCents: 0,
      taxCents: 0,
    };

    row.netCents += net;
    row.taxCents += tax;
    byRate.set(line.vatRateBps, row);
  }

  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    // Highest rate first, so a 0 % group reads as the footnote it usually is.
    vatBreakdown: [...byRate.values()].sort(
      (a, b) => b.vatRateBps - a.vatRateBps,
    ),
  };
}

/** A single row's live amount, or `null` while it is still half-typed. */
export function parseFormLine(line: {
  unit_type: "hours" | "flat";
  quantity: string;
  unit_price: string;
  vat_rate: string;
}): TotalsInput | null {
  const quantityHundredths =
    line.unit_type === "flat" ? 100 : parseQuantityToHundredths(line.quantity);
  const unitPriceCents = parseAmountToCents(line.unit_price);
  const vatRateBps = parsePercentToBps(line.vat_rate);

  if (
    quantityHundredths === null ||
    quantityHundredths <= 0 ||
    unitPriceCents === null ||
    vatRateBps === null
  ) {
    return null;
  }

  return { quantityHundredths, unitPriceCents, vatRateBps };
}

/**
 * Live totals for the form, ignoring rows that are not yet valid numbers.
 * A half-typed row contributes nothing rather than making the total flicker
 * to NaN while the user is still in the field.
 */
export function calculateFormTotals(
  lines: {
    unit_type: "hours" | "flat";
    quantity: string;
    unit_price: string;
    vat_rate: string;
  }[],
): InvoiceTotals {
  return calculateTotals(
    lines
      .map(parseFormLine)
      .filter((line): line is TotalsInput => line !== null),
  );
}
