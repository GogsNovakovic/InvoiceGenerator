-- 0008_invoice_guards.sql
-- Business rules that protect money live in the database, not in UI conditions:
-- the paid-invoice lock, the edited-after-send flag, and updated_at.
-- See docs/DB.md §6.4, §6.5, §6.6.

-- PRD §5.3: a paid invoice cannot be deleted (toggle it to not paid first).
-- Permanent lock: an invoice whose payment Stripe confirmed can never be edited
-- or deleted, even after the user toggles its status back to not paid.
-- status itself is excluded from the guarded list: the two-way toggle is a
-- product requirement.
create function public.guard_locked_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.stripe_confirmed_paid then
      raise exception 'Invoice % was paid through Stripe and cannot be deleted', old.invoice_number
        using errcode = 'check_violation';
    end if;
    if old.status = 'paid' then
      raise exception 'Invoice % is paid and cannot be deleted', old.invoice_number
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  -- UPDATE. Status, payment bookkeeping, PDF pointer and send state stay writable
  -- so the user can still toggle status and the webhook can still record a payment.
  if old.stripe_confirmed_paid and (
       new.invoice_number is distinct from old.invoice_number
    or new.currency       is distinct from old.currency
    or new.invoice_date   is distinct from old.invoice_date
    or new.due_date       is distinct from old.due_date
    or new.client_id      is distinct from old.client_id
    or new.comments       is distinct from old.comments
    or new.subtotal_cents is distinct from old.subtotal_cents
    or new.tax_cents      is distinct from old.tax_cents
    or new.total_cents    is distinct from old.total_cents
  ) then
    raise exception 'Invoice % was paid through Stripe and cannot be edited', old.invoice_number
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger invoices_guard_locked
  before update or delete on public.invoices
  for each row execute function public.guard_locked_invoice();

-- Stops the lock being circumvented by editing line items instead.
create function public.guard_locked_invoice_lines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locked boolean;
begin
  select stripe_confirmed_paid into v_locked
    from public.invoices
   where id = coalesce(new.invoice_id, old.invoice_id);

  if v_locked then
    raise exception 'Line items of a Stripe-paid invoice cannot be changed'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger invoice_line_items_guard_locked
  before insert or update or delete on public.invoice_line_items
  for each row execute function public.guard_locked_invoice_lines();

-- The sent_at guard is what lets a successful resend clear the flag: the resend
-- sets sent_at and edited_after_send = false in one statement, and because
-- sent_at changed the trigger does not re-raise the flag.
create function public.mark_invoice_edited_after_send()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.sent_at is not null
     and new.sent_at is not distinct from old.sent_at
     and (
          new.currency       is distinct from old.currency
       or new.invoice_date   is distinct from old.invoice_date
       or new.due_date       is distinct from old.due_date
       or new.client_id      is distinct from old.client_id
       or new.comments       is distinct from old.comments
       or new.subtotal_cents is distinct from old.subtotal_cents
       or new.tax_cents      is distinct from old.tax_cents
       or new.total_cents    is distinct from old.total_cents
     )
  then
    new.edited_after_send := true;
  end if;

  return new;
end;
$$;

create trigger invoices_mark_edited_after_send
  before update on public.invoices
  for each row execute function public.mark_invoice_edited_after_send();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();
