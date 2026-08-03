import "server-only";

import { cookies } from "next/headers";

import { toCurrency, type Currency } from "@/lib/currency";
import {
  invoiceClientLabel,
  isOverdue,
  today,
  type InvoiceListItem,
} from "@/lib/data/invoices";
import { createClient } from "@/utils/supabase/server";

/**
 * The dashboard aggregates from docs/DB.md §7.
 *
 * Amounts are grouped by currency and never added across currencies — an
 * invoice in USD and one in EUR do not sum to a meaningful number.
 */

export type CurrencyTotal = { currency: Currency; totalCents: number };

export type DashboardSummary = {
  outstanding: CurrencyTotal[];
  paidThisMonth: CurrencyTotal[];
  unpaidCount: number;
  overdueCount: number;
  recent: InvoiceListItem[];
};

const RECENT_LIMIT = 5;

function firstOfMonth(): string {
  const now = new Date();

  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * Summed in TypeScript rather than SQL on purpose: PostgREST has no group-by,
 * and the alternative is a database function for what is, per user, a few
 * hundred rows at most. Revisit if a user ever has tens of thousands.
 */
function sumByCurrency(
  rows: { currency: string; total_cents: number }[],
): CurrencyTotal[] {
  const totals = new Map<Currency, number>();

  for (const row of rows) {
    const currency = toCurrency(row.currency);
    totals.set(currency, (totals.get(currency) ?? 0) + row.total_cents);
  }

  return [...totals.entries()]
    .map(([currency, totalCents]) => ({ currency, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export async function getDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  const supabase = createClient(await cookies());
  const monthStart = firstOfMonth();
  const currentDate = today();

  const [unpaid, paid, overdue, recent] = await Promise.all([
    supabase
      .from("invoices")
      .select("currency, total_cents", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "not_paid"),
    supabase
      .from("invoices")
      .select("currency, total_cents")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("paid_at", `${monthStart}T00:00:00Z`),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "not_paid")
      .lt("due_date", currentDate),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, client_full_name, client_company_name, invoice_date, due_date, total_cents, currency, status, edited_after_send, payment_mismatch, sent_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  if (unpaid.error) throw unpaid.error;
  if (paid.error) throw paid.error;
  if (overdue.error) throw overdue.error;
  if (recent.error) throw recent.error;

  return {
    outstanding: sumByCurrency(unpaid.data ?? []),
    paidThisMonth: sumByCurrency(paid.data ?? []),
    unpaidCount: unpaid.count ?? 0,
    overdueCount: overdue.count ?? 0,
    recent: (recent.data ?? []).map((row) => ({
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
  };
}
