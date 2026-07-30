-- 0002_profiles.sql
-- Sender details, default currency, Stripe Connect state. 1:1 with auth.users.
-- See docs/DB.md §4.1, §5.1, §6.1.

create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,

  full_name                text,
  company_name             text,
  email                    text,
  address                  text,
  vat_id                   text,
  website                  text,

  default_currency         text not null default 'EUR'
                             check (default_currency in ('EUR','USD','GBP','CHF','BAM')),

  -- Stripe Connect (Express)
  stripe_account_id        text unique,
  stripe_details_submitted boolean not null default false,
  stripe_charges_enabled   boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- No insert policy: the signup trigger creates the row.
-- No delete policy: removal cascades from auth.users.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profile bootstrap on signup, so no code path has to handle a missing profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
