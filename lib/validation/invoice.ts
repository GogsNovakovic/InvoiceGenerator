import * as z from "zod";

import { CURRENCIES } from "@/lib/currency";
import {
  parseAmountToCents,
  parsePercentToBps,
  parseQuantityToHundredths,
} from "@/lib/money";

/**
 * One schema for the invoice form, shared between react-hook-form and the
 * Server Action (docs/Tech.md §4.5). Every field arrives as a string, because
 * that is what an input holds; the transforms are the single place where a
 * typed amount becomes integer cents and a typed percentage becomes basis
 * points.
 *
 * Zod checks shape, never entitlement. `client_id` being a valid uuid says
 * nothing about who owns that client — the action re-reads it by owner.
 */

export const MAX_LINE_ITEMS = 200;

/** ISO calendar date, as `<input type="date">` produces and Postgres expects. */
const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." })
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date.");

const description = z
  .string()
  .trim()
  .min(1, { error: "Describe what you are billing for." })
  .max(500, { error: "Description must be 500 characters or fewer." });

const quantity = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const hundredths = parseQuantityToHundredths(value);

    if (hundredths === null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a quantity, using at most two decimals.",
      });
      return z.NEVER;
    }

    if (hundredths <= 0) {
      ctx.addIssue({ code: "custom", message: "Quantity must be above zero." });
      return z.NEVER;
    }

    if (hundredths > 99_999_999) {
      ctx.addIssue({ code: "custom", message: "That quantity is too large." });
      return z.NEVER;
    }

    return hundredths;
  });

const unitPrice = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const cents = parseAmountToCents(value);

    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a price, using at most two decimals.",
      });
      return z.NEVER;
    }

    // 10 billion in minor units: comfortably above any real invoice line and
    // well inside the bigint column.
    if (cents > 1_000_000_000_000) {
      ctx.addIssue({ code: "custom", message: "That price is too large." });
      return z.NEVER;
    }

    return cents;
  });

/** Mirrors `vat_rate_bps between 0 and 10000` on the line items table. */
const vatRate = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const bps = parsePercentToBps(value);

    if (bps === null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a VAT rate, using at most two decimals.",
      });
      return z.NEVER;
    }

    if (bps > 10_000) {
      ctx.addIssue({
        code: "custom",
        message: "VAT rate must be between 0 % and 100 %.",
      });
      return z.NEVER;
    }

    return bps;
  });

export const lineItemSchema = z
  .object({
    description,
    unit_type: z.enum(["hours", "flat"], { error: "Choose a unit type." }),
    quantity,
    unit_price: unitPrice,
    vat_rate: vatRate,
  })
  // `flat` means the price is the whole fee, so quantity is pinned to 1. The
  // same rule exists as the `line_items_flat_quantity` check constraint.
  .transform((line) => ({
    description: line.description,
    unit_type: line.unit_type,
    quantity_hundredths: line.unit_type === "flat" ? 100 : line.quantity,
    unit_price_cents: line.unit_price,
    vat_rate_bps: line.vat_rate,
  }));

export const invoiceSchema = z
  .object({
    client_id: z.uuid({ error: "Choose a client." }),
    invoice_date: dateString,
    due_date: dateString,
    currency: z.enum(CURRENCIES, { error: "Choose a currency." }),
    comments: z
      .string()
      .trim()
      .max(2000, { error: "Comments must be 2000 characters or fewer." })
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    line_items: z
      .array(lineItemSchema)
      .min(1, { error: "Add at least one line item." })
      .max(MAX_LINE_ITEMS, {
        error: `An invoice can hold at most ${MAX_LINE_ITEMS} line items.`,
      }),
  })
  .refine((invoice) => invoice.due_date >= invoice.invoice_date, {
    error: "The due date cannot be before the invoice date.",
    path: ["due_date"],
  });

export const invoiceIdSchema = z.uuid({ error: "Invalid invoice." });

export const invoiceStatusSchema = z.enum(["not_paid", "paid"], {
  error: "Invalid status.",
});

/** The optional note the send dialog appends to the standard email body. */
export const sendNoteSchema = z
  .string()
  .trim()
  .max(1000, { error: "The note must be 1000 characters or fewer." })
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

/** What the form holds — strings throughout, including the line item rows. */
export type InvoiceFormValues = z.input<typeof invoiceSchema>;
export type LineItemFormValues = z.input<typeof lineItemSchema>;

/** What the action writes — cents, basis points and hundredths. */
export type InvoiceInput = z.output<typeof invoiceSchema>;
export type LineItemInput = z.output<typeof lineItemSchema>;
