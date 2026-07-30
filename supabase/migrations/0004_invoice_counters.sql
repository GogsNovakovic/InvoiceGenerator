-- 0004_invoice_counters.sql
-- Per-user, per-month sequence allocator. See docs/DB.md §4.3, §5.4, §6.2.

create table public.invoice_counters (
  user_id  uuid     not null references auth.users (id) on delete cascade,
  year     smallint not null,
  month    smallint not null,
  last_seq integer  not null default 0,

  primary key (user_id, year, month)
);

-- RLS enabled with no policies: reachable only through the security-definer
-- function below, so the counter cannot be tampered with directly.
alter table public.invoice_counters enable row level security;

create function public.next_invoice_number(p_invoice_date date default current_date)
returns table (invoice_number text, number_year smallint, number_month smallint, number_seq integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid     := (select auth.uid());
  v_year    smallint := extract(year  from p_invoice_date)::smallint;
  v_month   smallint := extract(month from p_invoice_date)::smallint;
  v_seq     integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- insert … on conflict do update … returning is a single atomic
  -- read-modify-write: concurrent callers serialize on the counter's row lock.
  insert into public.invoice_counters (user_id, year, month, last_seq)
  values (v_user_id, v_year, v_month, 1)
  on conflict (user_id, year, month)
    do update set last_seq = public.invoice_counters.last_seq + 1
  returning public.invoice_counters.last_seq into v_seq;

  return query select
    format('INV-%s-%s-%s', v_year::text,
                           lpad(v_month::text, 2, '0'),
                           lpad(v_seq::text,   4, '0')),
    v_year, v_month, v_seq;
end;
$$;

revoke all     on function public.next_invoice_number(date) from public;
grant  execute on function public.next_invoice_number(date) to authenticated;
