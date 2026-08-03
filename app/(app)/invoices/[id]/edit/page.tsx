import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth";
import { clientLabel, getClientById } from "@/lib/data/clients";
import { canEditInvoice, getInvoiceDetail } from "@/lib/data/invoices";
import { bpsToPercentInput, centsToAmountInput, quantityToInput } from "@/lib/money";
import type { InvoiceFormValues } from "@/lib/validation/invoice";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({
  params,
}: PageProps<"/invoices/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();
  const detail = await getInvoiceDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  const { invoice, lineItems } = detail;

  // Enforced again by the action and by the database trigger; this only spares
  // the user a form they would not be allowed to submit (docs/PRD.md §14).
  if (!canEditInvoice(invoice)) {
    redirect(`/invoices/${invoice.id}`);
  }

  // The picker follows the live client record, not the snapshot: it is there to
  // choose who the invoice points at. A deleted client leaves it empty, and the
  // user has to pick one before saving.
  const client = invoice.client_id
    ? await getClientById(user.id, invoice.client_id)
    : null;

  const values: InvoiceFormValues = {
    client_id: invoice.client_id ?? "",
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    currency: invoice.currency,
    comments: invoice.comments ?? "",
    line_items: lineItems.map((line) => ({
      description: line.description,
      unit_type: line.unit_type,
      quantity: quantityToInput(line.quantity),
      unit_price: centsToAmountInput(line.unit_price_cents),
      vat_rate: bpsToPercentInput(line.vat_rate_bps),
    })),
  };

  return (
    <>
      <PageHeader
        title={`Edit ${invoice.invoice_number}`}
        description="The invoice number never changes. Saving regenerates the PDF."
      />
      <InvoiceForm
        sender={{
          fullName: invoice.sender_full_name,
          companyName: invoice.sender_company_name,
          email: invoice.sender_email,
          address: invoice.sender_address,
          vatId: invoice.sender_vat_id,
          website: invoice.sender_website,
        }}
        defaultCurrency={invoice.currency}
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          client: client
            ? {
                id: client.id,
                label: clientLabel(client),
                email: client.email,
              }
            : null,
          values,
          sentAt: invoice.sent_at,
        }}
      />
    </>
  );
}
