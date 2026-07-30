-- 0011_invoice_vat_breakdown.sql
-- Per-rate VAT breakdown for the invoice screen and PDF. See docs/DB.md §4.8.
--
-- security_invoker = on is essential: without it the view would run with its
-- owner's privileges and bypass the line items' RLS.

create view public.invoice_vat_breakdown
with (security_invoker = on) as
select
  invoice_id,
  user_id,
  vat_rate_bps,
  sum(line_subtotal_cents) as net_cents,
  sum(line_tax_cents)      as tax_cents
from public.invoice_line_items
group by invoice_id, user_id, vat_rate_bps;
