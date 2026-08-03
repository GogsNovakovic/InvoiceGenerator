import "server-only";

import { cookies } from "next/headers";

import { toCurrency, type Currency } from "@/lib/currency";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type LineItemRow = Database["public"]["Tables"]["invoice_line_items"]["Row"];
type SendRow = Database["public"]["Tables"]["invoice_sends"]["Row"];

export const PAGE_SIZE = 20;

export const STATUS_FILTERS = ["all", "paid", "not_paid", "overdue"] as const;
export const SORT_FIELDS = ["date", "total"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export type InvoiceListItem = {
  id: string;
  invoice_number: string;
  client_label: string;
  invoice_date: string;
  due_date: string;
  total_cents: number;
  currency: Currency;
  status: "not_paid" | "paid";
  is_overdue: boolean;
  edited_after_send: boolean;
  payment_mismatch: boolean;
  sent_at: string | null;
};

export type InvoiceListResult = {
  invoices: InvoiceListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  pageCount: number;
};

export type InvoiceLineItem = Pick<
  LineItemRow,
  | "id"
  | "position"
  | "description"
  | "unit_type"
  | "quantity"
  | "unit_price_cents"
  | "vat_rate_bps"
  | "line_subtotal_cents"
  | "line_tax_cents"
>;

export type InvoiceVatRow = {
  vat_rate_bps: number;
  net_cents: number;
  tax_cents: number;
};

export type InvoiceSend = Pick<
  SendRow,
  "id" | "to_email" | "status" | "error_message" | "created_at"
>;

export type InvoiceRecord = Omit<InvoiceRow, "currency" | "search_text"> & {
  currency: Currency;
};

export type InvoiceDetail = {
  invoice: InvoiceRecord;
  lineItems: InvoiceLineItem[];
  vatBreakdown: InvoiceVatRow[];
  sends: InvoiceSend[];
};

const LIST_COLUMNS =
  "id, invoice_number, client_full_name, client_company_name, invoice_date, due_date, total_cents, currency, status, edited_after_send, payment_mismatch, sent_at";

const LINE_ITEM_COLUMNS =
  "id, position, description, unit_type, quantity, unit_price_cents, vat_rate_bps, line_subtotal_cents, line_tax_cents";

/** The client label always comes from the invoice's own snapshot, never a join. */
export function invoiceClientLabel(invoice: {
  client_full_name: string | null;
  client_company_name: string | null;
}) {
  return invoice.client_full_name ?? invoice.client_company_name ?? "—";
}

/** Not stored — derived at read time, exactly as docs/DB.md §7 specifies. */
export function isOverdue(invoice: {
  status: "not_paid" | "paid";
  due_date: string;
}) {
  return invoice.status === "not_paid" && invoice.due_date < today();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Only unpaid invoices are editable, and a Stripe-confirmed payment locks the
 * row for good (docs/PRD.md §14). Both rules are enforced again by the database
 * trigger; this is what lets the UI grey the button out first.
 */
export function canEditInvoice(invoice: {
  status: "not_paid" | "paid";
  stripe_confirmed_paid: boolean;
}) {
  return invoice.status === "not_paid" && !invoice.stripe_confirmed_paid;
}

export function canDeleteInvoice(invoice: {
  status: "not_paid" | "paid";
  stripe_confirmed_paid: boolean;
}) {
  return canEditInvoice(invoice);
}

/** LIKE wildcards in user input would otherwise widen the search silently. */
function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function listInvoices(
  userId: string,
  options: {
    query?: string;
    status?: StatusFilter;
    sort?: SortField;
    direction?: SortDirection;
    page?: number;
  } = {},
): Promise<InvoiceListResult> {
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;
  const sort = options.sort ?? "date";
  const direction = options.direction ?? "desc";
  const ascending = direction === "asc";
  const supabase = createClient(await cookies());

  let request = supabase
    .from("invoices")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  switch (options.status) {
    case "paid":
      request = request.eq("status", "paid");
      break;
    case "not_paid":
      request = request.eq("status", "not_paid");
      break;
    case "overdue":
      request = request.eq("status", "not_paid").lt("due_date", today());
      break;
    default:
      break;
  }

  const query = options.query?.trim();

  if (query) {
    // `search_text` is a generated column over the invoice number and both
    // client name snapshots (docs/DB.md §4.4), so one predicate covers the
    // whole of PRD §9's "number or client name".
    request = request.ilike("search_text", likePattern(query));
  }

  request =
    sort === "total"
      ? request.order("total_cents", { ascending })
      : request.order("invoice_date", { ascending });

  // A stable tiebreaker, or two invoices sharing a date can swap between pages.
  const { data, error, count } = await request
    .order("id", { ascending })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;

  return {
    invoices: (data ?? []).map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      client_label: invoiceClientLabel(row),
      invoice_date: row.invoice_date,
      due_date: row.due_date,
      total_cents: row.total_cents,
      currency: toCurrency(row.currency),
      status: row.status,
      is_overdue: isOverdue(row),
      edited_after_send: row.edited_after_send,
      payment_mismatch: row.payment_mismatch,
      sent_at: row.sent_at,
    })),
    page,
    pageSize: PAGE_SIZE,
    totalCount,
    pageCount: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  };
}

/** The invoice row alone. Used by actions that only need to authorize. */
export async function getInvoiceById(
  userId: string,
  invoiceId: string,
): Promise<InvoiceRecord | null> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? { ...data, currency: toCurrency(data.currency) } : null;
}

/**
 * Everything the detail screen and the PDF need, in three round trips.
 *
 * The VAT breakdown comes from the `invoice_vat_breakdown` view rather than
 * being summed here, so the screen and the PDF quote the database's own
 * grouping instead of a second implementation of it.
 */
export async function getInvoiceDetail(
  userId: string,
  invoiceId: string,
): Promise<InvoiceDetail | null> {
  const invoice = await getInvoiceById(userId, invoiceId);

  if (!invoice) {
    return null;
  }

  const supabase = createClient(await cookies());

  const [lineItems, vatBreakdown, sends] = await Promise.all([
    supabase
      .from("invoice_line_items")
      .select(LINE_ITEM_COLUMNS)
      .eq("user_id", userId)
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true }),
    supabase
      .from("invoice_vat_breakdown")
      .select("vat_rate_bps, net_cents, tax_cents")
      .eq("user_id", userId)
      .eq("invoice_id", invoiceId)
      .order("vat_rate_bps", { ascending: false }),
    supabase
      .from("invoice_sends")
      .select("id, to_email, status, error_message, created_at")
      .eq("user_id", userId)
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false }),
  ]);

  if (lineItems.error) throw lineItems.error;
  if (vatBreakdown.error) throw vatBreakdown.error;
  if (sends.error) throw sends.error;

  return {
    invoice,
    lineItems: lineItems.data ?? [],
    // The view's columns are all nullable in the generated types because a
    // grouped view has no not-null guarantees; the rows themselves never are.
    vatBreakdown: (vatBreakdown.data ?? []).map((row) => ({
      vat_rate_bps: row.vat_rate_bps ?? 0,
      net_cents: row.net_cents ?? 0,
      tax_cents: row.tax_cents ?? 0,
    })),
    sends: sends.data ?? [],
  };
}
