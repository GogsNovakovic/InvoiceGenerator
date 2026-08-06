import type Stripe from "stripe";

import type { Json } from "@/lib/database.types";
import { getStripe } from "@/lib/stripe/client";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * The Connect webhook (docs/Tech.md §9.3). Registered in Stripe as an endpoint
 * that listens to **connected accounts** — with direct charges the payment
 * happens on the freelancer's account, so a plain account endpoint never sees
 * these events at all.
 *
 * Subscribed events: `checkout.session.completed`, `account.updated`.
 *
 * This is the one place the service-role client is used: a webhook arrives with
 * no session, so there is no `auth.uid()` for RLS to work from.
 */
export const runtime = "nodejs";

/**
 * A handler returns `false` only for a *transient* failure — something that has
 * a chance of working on Stripe's next delivery attempt. Anything malformed or
 * unrecognised returns `true`: it is logged and accepted, because asking Stripe
 * to redeliver it forever changes nothing.
 */
type Handled = boolean;

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set — webhook rejected.");

    return new Response("Webhook not configured", { status: 500 });
  }

  // The raw bytes, before anything parses them: the signature is computed over
  // exactly what Stripe sent, and `await request.json()` would destroy it.
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    // Either a forgery or a secret mismatch. Both are 400, and neither is
    // something Stripe should retry.
    console.error("Stripe signature verification failed", error);

    return new Response("Invalid signature", { status: 400 });
  }

  const admin = getAdminClient();

  // The idempotency gate, and deliberately a database constraint rather than a
  // select-then-insert: two concurrent redeliveries of the same event both try
  // to insert the same primary key, and exactly one of them wins
  // (docs/DB.md §4.7).
  const gate = await admin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    stripe_account_id: event.account ?? null,
    // The whole event, kept as sent: when a payment is ever disputed, the
    // received bytes are the record, not this application's reading of them.
    payload: event as unknown as Json,
  });

  if (gate.error) {
    if (gate.error.code === "23505") {
      return new Response("Already processed", { status: 200 });
    }

    console.error("Stripe event could not be recorded", gate.error);

    return new Response("Could not record event", { status: 500 });
  }

  let handled: Handled;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        handled = await handleCheckoutCompleted(event);
        break;
      case "account.updated":
        handled = await handleAccountUpdated(event);
        break;
      default:
        console.warn("Unsubscribed Stripe event received", event.type);
        handled = true;
    }
  } catch (error) {
    console.error("Stripe event handler threw", { id: event.id, error });
    handled = false;
  }

  if (!handled) {
    // The gate row has to go, or Stripe's retry would be waved through as a
    // duplicate and the payment would never be applied.
    await admin.from("stripe_events").delete().eq("id", event.id);

    return new Response("Retry", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

/**
 * A client paid a payment link.
 *
 * The amount is compared before anything is marked paid, because a link keeps
 * its original amount for life while the invoice may have been edited
 * underneath it (docs/PRD.md §11.3–11.4). An amount that no longer matches is
 * recorded as a mismatch and left for the user to resolve — never silently
 * treated as payment in full.
 */
async function handleCheckoutCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
): Promise<Handled> {
  const session = event.data.object;
  const invoiceId = session.metadata?.invoice_id;
  const admin = getAdminClient();

  if (!invoiceId) {
    console.warn("Checkout session carried no invoice_id", session.id);

    return true;
  }

  const { data: invoice, error } = await admin
    .from("invoices")
    .select("id, user_id, total_cents, currency")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    console.error("Invoice lookup failed for webhook", { invoiceId, error });

    return false;
  }

  if (!invoice) {
    // Deleted between payment and delivery, or an id from another environment.
    console.warn("Checkout session names an unknown invoice", invoiceId);

    return true;
  }

  // The signature proves Stripe sent this; it does not prove the event belongs
  // to the account that owns this invoice. Metadata is attacker-controllable in
  // the general case, so the connected account is cross-checked against the
  // invoice's owner before a single row is touched (docs/Tech.md §12).
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", invoice.user_id)
    .maybeSingle();

  if (!profile?.stripe_account_id || profile.stripe_account_id !== event.account) {
    console.warn("Checkout session account does not own the invoice", {
      invoiceId,
      eventAccount: event.account,
    });

    return true;
  }

  await admin
    .from("stripe_events")
    .update({ invoice_id: invoice.id })
    .eq("id", event.id);

  // `complete` with an unpaid session happens for asynchronous methods that are
  // still processing. Marking the invoice now would call money received that
  // has not arrived.
  if (session.payment_status !== "paid") {
    console.warn("Checkout session completed without payment", {
      invoiceId,
      status: session.payment_status,
    });

    return true;
  }

  const matches =
    session.amount_total === invoice.total_cents &&
    session.currency?.toUpperCase() === invoice.currency;

  const update = matches
    ? {
        status: "paid" as const,
        paid_at: new Date().toISOString(),
        paid_source: "stripe" as const,
        // The permanent lock. Independent of `status`, which the user stays
        // free to toggle in both directions (docs/PRD.md §11.5).
        stripe_confirmed_paid: true,
      }
    : {
        amount_received_cents: session.amount_total,
        payment_mismatch: true,
      };

  const applied = await admin
    .from("invoices")
    .update(update)
    .eq("id", invoice.id);

  if (applied.error) {
    console.error("Invoice payment could not be applied", {
      invoiceId,
      error: applied.error,
    });

    return false;
  }

  return true;
}

/**
 * Keeps the cached onboarding flags current after the first sync — the user may
 * finish verification days later, and nothing in this app would otherwise
 * notice (docs/Tech.md §9.1).
 */
async function handleAccountUpdated(
  event: Stripe.AccountUpdatedEvent,
): Promise<Handled> {
  const account = event.data.object;

  const { error } = await getAdminClient()
    .from("profiles")
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_details_submitted: account.details_submitted,
    })
    .eq("stripe_account_id", account.id);

  if (error) {
    console.error("Account status could not be cached", {
      account: account.id,
      error,
    });

    return false;
  }

  return true;
}
