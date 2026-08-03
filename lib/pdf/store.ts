import "server-only";

import { cookies } from "next/headers";

import { getInvoiceDetail } from "@/lib/data/invoices";
import { toInvoiceView } from "@/lib/invoice-view";
import { invoicePdfPath, renderInvoicePdf } from "@/lib/pdf/render";
import { createClient } from "@/utils/supabase/server";

export const PDF_BUCKET = "invoices";

/**
 * Render an invoice's PDF and store it, then record the pointer on the row.
 *
 * The invoice is read back from the database first, so the document shows the
 * totals the trigger computed rather than anything the form believed
 * (docs/Tech.md §8). Editing an invoice calls this again and overwrites the
 * object at the same path.
 *
 * Failures are returned, not thrown: an invoice whose PDF failed still exists
 * and is offered a Regenerate button, rather than costing the user an invoice
 * number to a transient Storage error.
 */
export type PdfResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

export async function generateInvoicePdf(
  userId: string,
  invoiceId: string,
): Promise<PdfResult> {
  const detail = await getInvoiceDetail(userId, invoiceId);

  if (!detail) {
    return { ok: false, message: "This invoice no longer exists." };
  }

  const path = invoicePdfPath(userId, invoiceId);

  let buffer: Buffer;

  try {
    buffer = await renderInvoicePdf(toInvoiceView(detail));
  } catch (error) {
    console.error("PDF render failed", { invoiceId, error });
    return { ok: false, message: "The PDF could not be generated." };
  }

  const supabase = createClient(await cookies());

  const upload = await supabase.storage.from(PDF_BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (upload.error) {
    console.error("PDF upload failed", { invoiceId, error: upload.error });
    return { ok: false, message: "The PDF could not be stored." };
  }

  const { error } = await supabase
    .from("invoices")
    .update({ pdf_path: path, pdf_generated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (error) {
    console.error("PDF pointer update failed", { invoiceId, error });
    return { ok: false, message: "The PDF could not be linked to the invoice." };
  }

  return { ok: true, path };
}

/** Reads the stored object back. Used by the download route and the emailer. */
export async function downloadInvoicePdf(path: string): Promise<Buffer | null> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(path);

  if (error || !data) {
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function removeInvoicePdf(path: string): Promise<void> {
  const supabase = createClient(await cookies());
  const { error } = await supabase.storage.from(PDF_BUCKET).remove([path]);

  if (error) {
    // The invoice row is already gone by this point; a leftover object is a
    // storage leak, not a correctness problem, so it is logged and not raised.
    console.error("PDF removal failed", { path, error });
  }
}
