"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { getInvoiceById } from "@/lib/data/invoices";
import { getProfile, getStripeAccount } from "@/lib/data/profile";
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { invoicePdfFilename } from "@/lib/pdf/render";
import { downloadInvoicePdf } from "@/lib/pdf/store";
import { ensureInvoicePaymentLink } from "@/lib/stripe/payment-links";
import { invoiceIdSchema, sendNoteSchema } from "@/lib/validation/invoice";
import { createClient } from "@/utils/supabase/server";
import { sendInvoiceEmail } from "@/utils/resend/send-invoice";

/**
 * Emailing an invoice, as a Server Action with a real auth check — replacing
 * the open route handler that used to sit at `app/api/invoices/send`
 * (docs/Tech.md §10).
 *
 * Every attempt writes an `invoice_sends` row, successful or not, because the
 * send history on the detail screen is the user's only evidence of what
 * actually reached the client. Failures surface with the provider's message;
 * nothing is retried silently.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

function invalid(message: string) {
  return { ok: false as const, message };
}

export async function sendInvoiceAction(
  invoiceId: unknown,
  note?: unknown,
): Promise<ActionResult> {
  const parsedId = invoiceIdSchema.safeParse(invoiceId);

  if (!parsedId.success) {
    return invalid("Invalid invoice.");
  }

  const parsedNote = sendNoteSchema.safeParse(note);

  if (!parsedNote.success) {
    return invalid(
      parsedNote.error.issues[0]?.message ?? "That note is too long.",
    );
  }

  const user = await requireUser();
  const invoice = await getInvoiceById(user.id, parsedId.data);

  if (!invoice) {
    return invalid("This invoice no longer exists.");
  }

  // Both of these are disabled in the UI rather than reached, but a Server
  // Action is a public endpoint and re-checks them anyway.
  if (!invoice.client_email) {
    return invalid("This client has no email address.");
  }

  if (!invoice.pdf_path) {
    return invalid("Generate the PDF before sending this invoice.");
  }

  // Sending and collecting payment are one action in this product: until Stripe
  // is connected there is nothing to put in the email but the PDF, so the send
  // is refused rather than half-done (docs/PRD.md §11.1).
  const account = await getStripeAccount(user.id);

  if (!account.chargesEnabled) {
    return invalid("Connect Stripe to collect payment.");
  }

  // Creates the link only if this invoice has none — an invoice that predates
  // the Stripe connection would otherwise never get one, because links are made
  // at creation time. An existing link is returned untouched (docs/PRD.md §11.3).
  const link = await ensureInvoicePaymentLink(user.id, invoice.id);

  if (!link.ok) {
    return invalid(`The payment link could not be created. ${link.message}`);
  }

  const pdf = await downloadInvoicePdf(invoice.pdf_path);

  if (!pdf) {
    return invalid("The stored PDF could not be read. Regenerate it and retry.");
  }

  const profile = await getProfile(user.id);

  // The current profile address rather than the invoice's frozen copy: this is
  // where replies have to land today, not where they would have landed when
  // the invoice was issued.
  const replyTo = profile?.email ?? invoice.sender_email ?? user.email ?? null;
  const senderName =
    invoice.sender_full_name ??
    invoice.sender_company_name ??
    profile?.full_name ??
    profile?.company_name ??
    replyTo ??
    "your supplier";

  const result = await sendInvoiceEmail({
    to: invoice.client_email,
    replyTo,
    invoiceNumber: invoice.invoice_number,
    formattedTotal: formatCents(invoice.total_cents, invoice.currency),
    formattedDueDate: formatDate(invoice.due_date),
    senderName,
    clientName: invoice.client_full_name ?? invoice.client_company_name,
    note: parsedNote.data,
    paymentLinkUrl: link.url,
    pdf: {
      filename: invoicePdfFilename(invoice.invoice_number),
      content: pdf,
    },
  });

  const supabase = createClient(await cookies());

  await supabase.from("invoice_sends").insert({
    invoice_id: invoice.id,
    user_id: user.id,
    to_email: invoice.client_email,
    status: result.ok ? "sent" : "failed",
    resend_message_id: result.ok ? result.messageId : null,
    error_message: result.ok ? null : result.message,
    pdf_path: invoice.pdf_path,
  });

  if (!result.ok) {
    refresh();

    return invalid(`The email could not be sent. ${result.message}`);
  }

  // Both columns in one statement on purpose: `sent_at` changing is what stops
  // the edited-after-send trigger from immediately re-raising the flag it is
  // clearing here (docs/DB.md §6.5).
  const { error } = await supabase
    .from("invoices")
    .update({ sent_at: new Date().toISOString(), edited_after_send: false })
    .eq("id", invoice.id)
    .eq("user_id", user.id);

  if (error) {
    // The email is already gone; this is a bookkeeping failure, not a send
    // failure, and saying otherwise would invite a duplicate send.
    console.error("Send bookkeeping failed", { invoiceId: invoice.id, error });
  }

  refresh();

  return { ok: true };
}
