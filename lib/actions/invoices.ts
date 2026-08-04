"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { getClientById } from "@/lib/data/clients";
import {
  canDeleteInvoice,
  canEditInvoice,
  getInvoiceById,
} from "@/lib/data/invoices";
import { getProfile } from "@/lib/data/profile";
import { generateInvoicePdf, removeInvoicePdf } from "@/lib/pdf/store";
import {
  invoiceIdSchema,
  invoiceSchema,
  invoiceStatusSchema,
  type InvoiceInput,
} from "@/lib/validation/invoice";
import { createClient } from "@/utils/supabase/server";

/**
 * Every action here follows the shape in docs/Tech.md §4.5: authenticate,
 * validate the shape with Zod, re-read the row by ownership, authorize the
 * operation, then mutate. The client sends an id and a change — never a record,
 * and never a total. Totals are the database's (docs/DB.md §6.3).
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

export type SaveInvoiceResult =
  | {
      ok: true;
      invoiceId: string;
      /** Set when the invoice saved but its PDF did not (docs/PRD.md §8). */
      pdfWarning?: string;
      /** True when the invoice had already been emailed, so the UI can offer a resend. */
      wasSent?: boolean;
    }
  | { ok: false; message: string };

function invalid(message: string) {
  return { ok: false as const, message };
}

/**
 * Only messages this codebase authored reach the user. A `custom` issue is one
 * of ours — "Enter a valid date.", "Quantity must be above zero." — and says
 * something actionable. Anything else is a shape mismatch between the form and
 * the schema, which is a bug rather than user error, so it goes to the server
 * log instead of being dressed up as advice.
 */
function firstIssue(
  error: { issues: { code: string; message: string; path: PropertyKey[] }[] },
  context: string,
) {
  const authored = error.issues.find((issue) => issue.code === "custom");

  if (authored) {
    return authored.message;
  }

  console.error(`${context}: unexpected validation issues`, error.issues);

  return "Check the form and try again.";
}

/** Line items are always rewritten wholesale — see docs/DB.md §7 on editing. */
function lineItemRows(
  invoiceId: string,
  userId: string,
  lines: InvoiceInput["line_items"],
) {
  return lines.map((line, index) => ({
    invoice_id: invoiceId,
    user_id: userId,
    position: index,
    description: line.description,
    unit_type: line.unit_type,
    quantity: line.quantity_hundredths / 100,
    unit_price_cents: line.unit_price_cents,
    vat_rate_bps: line.vat_rate_bps,
  }));
}

export async function createInvoiceAction(
  input: unknown,
): Promise<SaveInvoiceResult> {
  const parsed = invoiceSchema.safeParse(input);

  if (!parsed.success) {
    return invalid(firstIssue(parsed.error, "createInvoiceAction"));
  }

  const user = await requireUser();

  // Ownership of the chosen client is re-read here; a well-formed uuid in the
  // payload proves nothing about who it belongs to.
  const [profile, client] = await Promise.all([
    getProfile(user.id),
    getClientById(user.id, parsed.data.client_id),
  ]);

  if (!client) {
    return invalid("Choose one of your clients.");
  }

  const supabase = createClient(await cookies());

  // Allocated inside the database so two simultaneous saves cannot collide
  // (docs/DB.md §6.2). The date decides which month's counter is used.
  const numbering = await supabase.rpc("next_invoice_number", {
    p_invoice_date: parsed.data.invoice_date,
  });

  const allocated = numbering.data?.[0];

  if (numbering.error || !allocated) {
    return invalid("Could not allocate an invoice number. Try again.");
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      client_id: client.id,
      invoice_number: allocated.invoice_number,
      number_year: allocated.number_year,
      number_month: allocated.number_month,
      number_seq: allocated.number_seq,
      currency: parsed.data.currency,
      invoice_date: parsed.data.invoice_date,
      due_date: parsed.data.due_date,
      comments: parsed.data.comments,

      // Frozen at creation. Editing the profile or the client later cannot
      // rewrite what this invoice says (docs/PRD.md §7.1).
      sender_full_name: profile?.full_name ?? null,
      sender_company_name: profile?.company_name ?? null,
      sender_email: profile?.email ?? null,
      sender_address: profile?.address ?? null,
      sender_vat_id: profile?.vat_id ?? null,
      sender_website: profile?.website ?? null,

      client_full_name: client.full_name,
      client_company_name: client.company_name,
      client_email: client.email,
      client_address: client.address,
      client_vat_id: client.vat_id,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    return invalid("Could not create the invoice. Try again.");
  }

  const lines = await supabase
    .from("invoice_line_items")
    .insert(lineItemRows(invoice.id, user.id, parsed.data.line_items));

  if (lines.error) {
    // There is no transaction across these calls, so an invoice with no lines
    // is rolled back by hand rather than left behind as a zero-total record.
    await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id)
      .eq("user_id", user.id);

    return invalid("Could not save the line items. Try again.");
  }

  const pdf = await generateInvoicePdf(user.id, invoice.id);

  refresh();

  return {
    ok: true,
    invoiceId: invoice.id,
    pdfWarning: pdf.ok ? undefined : pdf.message,
  };
}

export async function updateInvoiceAction(
  invoiceId: unknown,
  input: unknown,
): Promise<SaveInvoiceResult> {
  const parsedId = invoiceIdSchema.safeParse(invoiceId);

  if (!parsedId.success) {
    return invalid("Invalid invoice.");
  }

  const parsed = invoiceSchema.safeParse(input);

  if (!parsed.success) {
    return invalid(firstIssue(parsed.error, "updateInvoiceAction"));
  }

  const user = await requireUser();
  const existing = await getInvoiceById(user.id, parsedId.data);

  if (!existing) {
    return invalid("This invoice no longer exists.");
  }

  if (!canEditInvoice(existing)) {
    return invalid(
      existing.stripe_confirmed_paid
        ? "This invoice was paid through Stripe and can no longer be edited."
        : "Mark this invoice as not paid before editing it.",
    );
  }

  const supabase = createClient(await cookies());

  // The snapshot is refreshed only when the invoice is pointed at a different
  // client. Keeping the same client leaves the billed-to block exactly as it
  // was issued, and the sender block is never re-copied.
  let snapshot = {};

  if (parsed.data.client_id !== existing.client_id) {
    const client = await getClientById(user.id, parsed.data.client_id);

    if (!client) {
      return invalid("Choose one of your clients.");
    }

    snapshot = {
      client_id: client.id,
      client_full_name: client.full_name,
      client_company_name: client.company_name,
      client_email: client.email,
      client_address: client.address,
      client_vat_id: client.vat_id,
    };
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      currency: parsed.data.currency,
      invoice_date: parsed.data.invoice_date,
      due_date: parsed.data.due_date,
      comments: parsed.data.comments,
      ...snapshot,
    })
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    return invalid("Could not save the invoice. Try again.");
  }

  // Delete and reinsert rather than diff: it sidesteps position collisions and
  // lets the totals trigger settle naturally (docs/DB.md §7).
  const cleared = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", parsedId.data)
    .eq("user_id", user.id);

  if (cleared.error) {
    return invalid("Could not save the line items. Try again.");
  }

  const lines = await supabase
    .from("invoice_line_items")
    .insert(lineItemRows(parsedId.data, user.id, parsed.data.line_items));

  if (lines.error) {
    return invalid("Could not save the line items. Try again.");
  }

  const pdf = await generateInvoicePdf(user.id, parsedId.data);

  refresh();

  return {
    ok: true,
    invoiceId: parsedId.data,
    pdfWarning: pdf.ok ? undefined : pdf.message,
    wasSent: existing.sent_at !== null,
  };
}

export async function deleteInvoiceAction(
  invoiceId: unknown,
): Promise<ActionResult> {
  const parsedId = invoiceIdSchema.safeParse(invoiceId);

  if (!parsedId.success) {
    return invalid("Invalid invoice.");
  }

  const user = await requireUser();
  const existing = await getInvoiceById(user.id, parsedId.data);

  if (!existing) {
    return invalid("This invoice no longer exists.");
  }

  if (!canDeleteInvoice(existing)) {
    return invalid(
      existing.stripe_confirmed_paid
        ? "This invoice was paid through Stripe and cannot be deleted."
        : "Mark this invoice as not paid before deleting it.",
    );
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    return invalid("Could not delete the invoice. Try again.");
  }

  // The number is retired with the row and leaves a permanent gap in the
  // sequence, exactly as docs/PRD.md §13 requires.
  if (existing.pdf_path) {
    await removeInvoicePdf(existing.pdf_path);
  }

  refresh();

  return { ok: true };
}

/**
 * The manual toggle from docs/PRD.md §10 — free in both directions and asking
 * no questions, even on an invoice Stripe confirmed. `paid_source` and
 * `paid_at` are left in place when unpaying, as history.
 */
export async function setInvoiceStatusAction(
  invoiceId: unknown,
  status: unknown,
): Promise<ActionResult> {
  const parsedId = invoiceIdSchema.safeParse(invoiceId);
  const parsedStatus = invoiceStatusSchema.safeParse(status);

  if (!parsedId.success || !parsedStatus.success) {
    return invalid("Invalid status change.");
  }

  const user = await requireUser();
  const existing = await getInvoiceById(user.id, parsedId.data);

  if (!existing) {
    return invalid("This invoice no longer exists.");
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase
    .from("invoices")
    .update(
      parsedStatus.data === "paid"
        ? {
            status: "paid" as const,
            paid_at: new Date().toISOString(),
            // Only the webhook ever writes 'stripe'; a manual mark is manual
            // even on an invoice Stripe had confirmed earlier.
            paid_source: "manual" as const,
          }
        : { status: "not_paid" as const },
    )
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    return invalid("Could not change the status. Try again.");
  }

  refresh();

  return { ok: true };
}

/** Retry after a failed generation, and a way to force a fresh render. */
export async function regenerateInvoicePdfAction(
  invoiceId: unknown,
): Promise<ActionResult> {
  const parsedId = invoiceIdSchema.safeParse(invoiceId);

  if (!parsedId.success) {
    return invalid("Invalid invoice.");
  }

  const user = await requireUser();
  const existing = await getInvoiceById(user.id, parsedId.data);

  if (!existing) {
    return invalid("This invoice no longer exists.");
  }

  const pdf = await generateInvoicePdf(user.id, parsedId.data);

  if (!pdf.ok) {
    return invalid(pdf.message);
  }

  refresh();

  return { ok: true };
}
