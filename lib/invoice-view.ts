import type { Currency } from "@/lib/currency";
import type { InvoiceDetail } from "@/lib/data/invoices";
import type { ProfileRecord } from "@/lib/data/profile";

/**
 * One shape, rendered twice: as HTML on the invoice detail screen and as the
 * PDF. Both readers get the same numbers because both start here, and every
 * amount in it came out of the database rather than being recomputed.
 *
 * Type-only imports from the server-only data layer, so this module stays
 * usable from a client component.
 */

export type InvoicePartyView = {
  fullName: string | null;
  companyName: string | null;
  email: string | null;
  address: string | null;
  vatId: string | null;
  website: string | null;
};

export type InvoiceLineView = {
  id: string;
  description: string;
  unitType: "hours" | "flat";
  quantity: string;
  unitPriceCents: number;
  vatRateBps: number;
  lineSubtotalCents: number;
  lineTaxCents: number;
};

export type InvoiceVatView = {
  vatRateBps: number;
  netCents: number;
  taxCents: number;
};

export type InvoiceView = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: Currency;
  sender: InvoicePartyView;
  client: InvoicePartyView;
  lines: InvoiceLineView[];
  vatBreakdown: InvoiceVatView[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  comments: string | null;
};

export function partyLabel(party: InvoicePartyView): string {
  return party.fullName ?? party.companyName ?? "—";
}

/**
 * The From block for an invoice that does not exist yet — the same shape the
 * saved snapshot will take, so the create form previews exactly what it is
 * about to freeze onto the invoice.
 */
export function senderFromProfile(
  profile: ProfileRecord | null,
): InvoicePartyView {
  return {
    fullName: profile?.full_name ?? null,
    companyName: profile?.company_name ?? null,
    email: profile?.email ?? null,
    address: profile?.address ?? null,
    vatId: profile?.vat_id ?? null,
    website: profile?.website ?? null,
  };
}

export function toInvoiceView(detail: InvoiceDetail): InvoiceView {
  const { invoice, lineItems, vatBreakdown } = detail;

  return {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    currency: invoice.currency,
    sender: {
      fullName: invoice.sender_full_name,
      companyName: invoice.sender_company_name,
      email: invoice.sender_email,
      address: invoice.sender_address,
      vatId: invoice.sender_vat_id,
      website: invoice.sender_website,
    },
    client: {
      fullName: invoice.client_full_name,
      companyName: invoice.client_company_name,
      email: invoice.client_email,
      address: invoice.client_address,
      vatId: invoice.client_vat_id,
      website: null,
    },
    lines: lineItems.map((line) => ({
      id: line.id,
      description: line.description,
      unitType: line.unit_type,
      quantity: String(line.quantity),
      unitPriceCents: line.unit_price_cents,
      vatRateBps: line.vat_rate_bps,
      lineSubtotalCents: line.line_subtotal_cents ?? 0,
      lineTaxCents: line.line_tax_cents ?? 0,
    })),
    vatBreakdown: vatBreakdown.map((row) => ({
      vatRateBps: row.vat_rate_bps,
      netCents: row.net_cents,
      taxCents: row.tax_cents,
    })),
    subtotalCents: invoice.subtotal_cents,
    taxCents: invoice.tax_cents,
    totalCents: invoice.total_cents,
    comments: invoice.comments,
  };
}
