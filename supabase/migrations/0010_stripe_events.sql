-- 0010_stripe_events.sql
-- Processed Stripe event ids: the webhook idempotency gate. See docs/DB.md §4.7, §5.4.

create table public.stripe_events (
  id                text primary key,          -- Stripe event id, e.g. evt_1A2b3C
  type              text not null,
  stripe_account_id text,
  invoice_id        uuid references public.invoices (id) on delete set null,
  payload           jsonb,
  received_at       timestamptz not null default now()
);

create index stripe_events_invoice_idx on public.stripe_events (invoice_id);

-- The primary key is the idempotency mechanism. The webhook's first action is
-- to insert the event id; a unique violation means this event was already
-- handled, so it returns 200 and does nothing further. A database constraint
-- rather than a select-then-insert check is what makes this safe when Stripe
-- delivers the same event twice concurrently.

-- RLS enabled with no policies: reachable only by the service-role client
-- inside the webhook.
alter table public.stripe_events enable row level security;
