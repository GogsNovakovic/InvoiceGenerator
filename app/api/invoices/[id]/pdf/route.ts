import { requireUser } from "@/lib/auth";
import { getInvoiceById } from "@/lib/data/invoices";
import { invoicePdfFilename } from "@/lib/pdf/render";
import { downloadInvoicePdf } from "@/lib/pdf/store";

/**
 * The only way a PDF leaves Storage. The bucket is private and object paths are
 * never handed out, so every download is authenticated and ownership-checked
 * here (docs/Tech.md §8).
 *
 * A missing invoice and someone else's invoice both come back as 404: the read
 * is scoped by `user_id`, so the two cases are indistinguishable by design.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/invoices/[id]/pdf">,
) {
  const { id } = await context.params;
  const user = await requireUser();
  const invoice = await getInvoiceById(user.id, id);

  if (!invoice) {
    return new Response("Not found", { status: 404 });
  }

  if (!invoice.pdf_path) {
    return new Response("This invoice has no PDF yet.", { status: 404 });
  }

  const pdf = await downloadInvoicePdf(invoice.pdf_path);

  if (!pdf) {
    return new Response("The stored PDF could not be read.", { status: 404 });
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `attachment; filename="${invoicePdfFilename(
        invoice.invoice_number,
      )}"`,
      // Per-user, per-invoice and re-generated on every edit — never cached by
      // a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
