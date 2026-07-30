-- 0003_clients.sql
-- The user's client book. See docs/DB.md §4.2, §5.2.

create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,

  full_name    text,
  company_name text,
  email        text,
  address      text,
  vat_id       text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A client needs some name to be selectable in a dropdown and printable in
  -- the To block. Email stays nullable: a missing email disables Send.
  constraint clients_display_name_present check (
    coalesce(nullif(btrim(full_name), ''), nullif(btrim(company_name), '')) is not null
  )
);

create index clients_user_created_idx on public.clients (user_id, created_at desc);

alter table public.clients enable row level security;

create policy clients_select_own on public.clients
  for select to authenticated using (user_id = (select auth.uid()));

create policy clients_insert_own on public.clients
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy clients_update_own on public.clients
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy clients_delete_own on public.clients
  for delete to authenticated using (user_id = (select auth.uid()));
