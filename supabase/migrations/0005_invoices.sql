-- 0005_invoices.sql
-- One row per invoice: numbering, frozen sender/client snapshots, totals,
-- PDF pointer, Stripe link, payment state. See docs/DB.md §4.4, §5.2.

create table public.invoices (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users (id) on delete cascade,
  client_id                   uuid references public.clients (id) on delete set null,

  -- numbering
  invoice_number              text     not null,
  number_year                 smallint not null,
  number_month                smallint not null,
  number_seq                  integer  not null,

  -- header
  status                      public.invoice_status not null default 'not_paid',
  currency                    text not null check (currency in ('EUR','USD','GBP','CHF','BAM')),
  invoice_date                date not null default current_date,
  due_date                    date not null,

  -- totals, maintained by trigger from the line items
  subtotal_cents              bigint not null default 0,
  tax_cents                   bigint not null default 0,
  total_cents                 bigint not null default 0,

  comments                    text,

  -- frozen sender snapshot (from profiles at creation time)
  sender_full_name            text,
  sender_company_name         text,
  sender_email                text,
  sender_address              text,
  sender_vat_id               text,
  sender_website              text,

  -- frozen client snapshot (from clients at creation time)
  client_full_name            text,
  client_company_name         text,
  client_email                text,
  client_address              text,
  client_vat_id               text,

  -- PDF
  pdf_path                    text,
  pdf_generated_at            timestamptz,

  -- sending
  sent_at                     timestamptz,
  edited_after_send           boolean not null default false,

  -- Stripe payment link
  stripe_payment_link_id      text,
  stripe_payment_link_url     text,
  stripe_payment_link_active  boolean not null default true,

  -- payment state
  paid_at                     timestamptz,
  paid_source                 public.paid_source,
  stripe_confirmed_paid       boolean not null default false,
  amount_received_cents       bigint,
  payment_mismatch            boolean not null default false,

  -- search: generated, so the trigram index cannot drift out of sync
  search_text                 text generated always as (
                                coalesce(invoice_number, '')      || ' ' ||
                                coalesce(client_full_name, '')    || ' ' ||
                                coalesce(client_company_name, '')
                              ) stored,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- (id, user_id) is the target of the line items' composite foreign key,
  -- which is what makes their denormalized user_id trustworthy.
  constraint invoices_id_user_unique     unique (id, user_id),
  constraint invoices_number_unique      unique (user_id, invoice_number),
  constraint invoices_seq_unique         unique (user_id, number_year, number_month, number_seq),
  constraint invoices_due_after_issue    check (due_date >= invoice_date),
  constraint invoices_amounts_signed     check (subtotal_cents >= 0 and tax_cents >= 0 and total_cents >= 0),
  constraint invoices_total_consistent   check (total_cents = subtotal_cents + tax_cents),
  constraint invoices_paid_has_source    check (status <> 'paid' or paid_source is not null),
  constraint invoices_client_snapshot    check (
    coalesce(nullif(btrim(client_full_name), ''), nullif(btrim(client_company_name), '')) is not null
  )
);

create index invoices_user_date_idx    on public.invoices (user_id, invoice_date desc, id desc);
create index invoices_user_status_idx  on public.invoices (user_id, status);
create index invoices_user_total_idx   on public.invoices (user_id, total_cents desc);
create index invoices_client_idx       on public.invoices (client_id);
create index invoices_overdue_idx      on public.invoices (user_id, due_date) where status = 'not_paid';
create index invoices_search_idx       on public.invoices using gin (search_text extensions.gin_trgm_ops);

create unique index invoices_payment_link_idx
  on public.invoices (stripe_payment_link_id)
  where stripe_payment_link_id is not null;

alter table public.invoices enable row level security;

create policy invoices_select_own on public.invoices
  for select to authenticated using (user_id = (select auth.uid()));

create policy invoices_insert_own on public.invoices
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy invoices_update_own on public.invoices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy invoices_delete_own on public.invoices
  for delete to authenticated using (user_id = (select auth.uid()));
