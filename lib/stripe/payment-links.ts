import "server-only";

import { cookies } from "next/headers";

import { getInvoiceById } from "@/lib/data/invoices";
import { getStripeAccount } from "@/lib/data/profile";
import { getStripe, stripeErrorMessage } from "@/lib/stripe/client";
import { createClient } from "@/utils/supabase/server";

/**
 * The payment link for one invoice, created on the freelancer's own connected
 * account with direct charges — the money never touches a platform balance and
 * no application fee is taken (docs/PRD.md §11.1).
 *
 * A link is created **once** and never revised, even when the invoice is later
 * edited (docs/PRD.md §11.3). The one-off Price is what makes that concrete:
 * the amount is fixed at creation and cannot drift from what the client was
 * shown. The webhook's amount comparison is the safety net for the case where
 * the invoice moves on and the link does not.
 */

export type PaymentLinkResult =
  /** `url: null` means there was nothing to create, not that something failed. */
  | { ok: true; url: string | null }
  | { ok: false; message: string };

export async function ensureInvoicePaymentLink(
  userId: string,
  invoiceId: string,
): Promise<PaymentLinkResult> {
  const invoice = await getInvoiceById(userId, invoiceId);

  if (!invoice) {
    return { ok: false, message: "This invoice no longer exists." };
  }

  // Already has one: hand it back untouched. This is the rule from §11.3, and
  // it is also what makes this function safe to call on every send.
  if (invoice.stripe_payment_link_url) {
    return { ok: true, url: invoice.stripe_payment_link_url };
  }

  const account = await getStripeAccount(userId);

  // Not connected yet, or connected but not yet cleared for charges. The
  // invoice is still perfectly usable — it just has no link (docs/PRD.md §11.1).
  if (!account.accountId || !account.chargesEnabled) {
    return { ok: true, url: null };
  }

  // Stripe rejects a zero-amount price, and a zero-total invoice has nothing to
  // collect anyway.
  if (invoice.total_cents <= 0) {
    return { ok: true, url: null };
  }

  const stripeAccount = account.accountId;
  let linkId: string;
  let linkUrl: string;

  try {
    const stripe = getStripe();

    // Three calls, because the Payment Links API takes a Price rather than a
    // bare amount (docs/Tech.md §9.2). All three are made on the connected
    // account, never on the platform.
    const product = await stripe.products.create(
      { name: `Invoice ${invoice.invoice_number}` },
      { stripeAccount },
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: invoice.total_cents,
        // Stripe wants the lowercase ISO code; the database stores 'EUR'.
        currency: invoice.currency.toLowerCase(),
      },
      { stripeAccount },
    );

    const link = await stripe.paymentLinks.create(
      {
        line_items: [{ price: price.id, quantity: 1 }],
        // What the webhook keys on. Stripe copies a payment link's metadata onto
        // every Checkout Session the link creates, so it arrives on the event.
        metadata: { invoice_id: invoice.id, user_id: userId },
        after_completion: { type: "hosted_confirmation" },
      },
      { stripeAccount },
    );

    linkId = link.id;
    linkUrl = link.url;
  } catch (error) {
    return {
      ok: false,
      message: stripeErrorMessage(error, "ensureInvoicePaymentLink"),
    };
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase
    .from("invoices")
    .update({
      stripe_payment_link_id: linkId,
      stripe_payment_link_url: linkUrl,
      stripe_payment_link_active: true,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (error) {
    console.error("Payment link could not be stored", { invoiceId, error });

    return {
      ok: false,
      message: "The payment link was created but could not be saved.",
    };
  }

  return { ok: true, url: linkUrl };
}

/**
 * Deleting an invoice deactivates its link, so nobody can pay an invoice that
 * no longer exists (docs/PRD.md §13). Deactivating is not deleting: Stripe
 * keeps the object, and anyone opening the URL is told the link is inactive.
 */
export async function deactivateInvoicePaymentLink(
  userId: string,
  paymentLinkId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const account = await getStripeAccount(userId);

  if (!account.accountId) {
    // The link cannot be reached without the account it lives on. This only
    // happens if the account id was cleared after the link was created.
    console.error("Payment link cannot be deactivated: no connected account", {
      paymentLinkId,
    });

    return { ok: true };
  }

  try {
    await getStripe().paymentLinks.update(
      paymentLinkId,
      { active: false },
      { stripeAccount: account.accountId },
    );

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: stripeErrorMessage(error, "deactivateInvoicePaymentLink"),
    };
  }
}
