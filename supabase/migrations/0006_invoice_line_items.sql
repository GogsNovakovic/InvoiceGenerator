-- 0006_invoice_line_items.sql
-- Line items with per-line generated subtotal and tax. See docs/DB.md §4.5, §5.2.

create table public.invoice_line_items (
  id                  uuid primary key default gen_random_uuid(),
  invoice_id          uuid not null,
  user_id             uuid not null,

  position            smallint not null,
  description         text not null check (btrim(description) <> ''),
  unit_type           public.line_unit_type not null default 'hours',
  quantity            numeric(12,2) not null default 1 check (quantity > 0),
  unit_price_cents    bigint  not null default 0 check (unit_price_cents >= 0),
  vat_rate_bps        integer not null default 0 check (vat_rate_bps between 0 and 10000),

  -- Each line rounds to whole cents; invoice totals sum these already-rounded
  -- values. There is no other code path that computes a line total.
  line_subtotal_cents bigint generated always as
                        (round(quantity * unit_price_cents)::bigint) stored,
  line_tax_cents      bigint generated always as
                        (round(round(quantity * unit_price_cents) * vat_rate_bps / 10000.0)::bigint) stored,

  created_at          timestamptz not null default now(),

  -- The composite FK is what makes the denormalized user_id trustworthy: a line
  -- item cannot claim an owner different from its invoice's owner, so the plain
  -- user_id = auth.uid() policy below needs no join.
  constraint line_items_invoice_fk foreign key (invoice_id, user_id)
    references public.invoices (id, user_id) on delete cascade,
  constraint line_items_flat_quantity check (unit_type <> 'flat' or quantity = 1),
  constraint line_items_position_unique unique (invoice_id, position) deferrable initially immediate
);

create index line_items_invoice_idx on public.invoice_line_items (invoice_id, position);
create index line_items_user_idx    on public.invoice_line_items (user_id);

alter table public.invoice_line_items enable row level security;

create policy invoice_line_items_select_own on public.invoice_line_items
  for select to authenticated using (user_id = (select auth.uid()));

create policy invoice_line_items_insert_own on public.invoice_line_items
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy invoice_line_items_update_own on public.invoice_line_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy invoice_line_items_delete_own on public.invoice_line_items
  for delete to authenticated using (user_id = (select auth.uid()));
