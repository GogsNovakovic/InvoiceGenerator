-- 0009_invoice_sends.sql
-- Append-only log of every email send attempt. See docs/DB.md §4.6, §5.3.

create table public.invoice_sends (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid not null,
  user_id           uuid not null,

  to_email          text not null,
  status            public.send_status not null,
  resend_message_id text,
  error_message     text,
  pdf_path          text,

  created_at        timestamptz not null default now(),

  constraint invoice_sends_invoice_fk foreign key (invoice_id, user_id)
    references public.invoices (id, user_id) on delete cascade
);

create index invoice_sends_invoice_idx on public.invoice_sends (invoice_id, created_at desc);
create index invoice_sends_user_idx    on public.invoice_sends (user_id);

alter table public.invoice_sends enable row level security;

-- select and insert only, deliberately no update or delete: a user cannot
-- rewrite their own send history.
create policy invoice_sends_select_own on public.invoice_sends
  for select to authenticated using (user_id = (select auth.uid()));

create policy invoice_sends_insert_own on public.invoice_sends
  for insert to authenticated with check (user_id = (select auth.uid()));
