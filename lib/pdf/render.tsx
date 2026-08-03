import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import type { InvoiceView } from "@/lib/invoice-view";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";

/**
 * The one place that turns an invoice into bytes. Kept separate from the
 * document so callers never import JSX, and separate from storage so the same
 * buffer can be uploaded, streamed or attached to an email.
 */
export async function renderInvoicePdf(invoice: InvoiceView): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}

/** `invoices/{user_id}/{invoice_id}.pdf` — the layout docs/DB.md §5.5 relies on. */
export function invoicePdfPath(userId: string, invoiceId: string): string {
  return `${userId}/${invoiceId}.pdf`;
}

export function invoicePdfFilename(invoiceNumber: string): string {
  return `${invoiceNumber}.pdf`;
}
