-- 0007_invoice_totals_trigger.sql
-- The database owns the arithmetic: the application never writes totals itself,
-- which is what makes invoices_total_consistent always satisfiable.
-- See docs/DB.md §6.3.

create function public.recompute_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i
     set subtotal_cents = coalesce(t.subtotal, 0),
         tax_cents      = coalesce(t.tax, 0),
         total_cents    = coalesce(t.subtotal, 0) + coalesce(t.tax, 0),
         updated_at     = now()
    from (
      select sum(line_subtotal_cents) as subtotal,
             sum(line_tax_cents)      as tax
        from public.invoice_line_items
       where invoice_id = v_invoice_id
    ) t
   where i.id = v_invoice_id;

  return null;
end;
$$;

-- Row-level rather than statement-level with transition tables: an invoice
-- carries on the order of ten lines, so the extra updates are negligible and
-- the simpler trigger is easier to reason about.
create trigger invoice_line_items_recompute
  after insert or update or delete on public.invoice_line_items
  for each row execute function public.recompute_invoice_totals();
