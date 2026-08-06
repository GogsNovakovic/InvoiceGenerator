import "server-only";

import { cookies } from "next/headers";

import { getAppUrl } from "@/lib/app-url";
import {
  getStripeAccount,
  stripeConnectionState,
  type StripeAccountRecord,
} from "@/lib/data/profile";
import { getStripe, stripeErrorMessage } from "@/lib/stripe/client";
import { createClient } from "@/utils/supabase/server";

/**
 * Connect onboarding, as described in docs/Tech.md §9.1: each freelancer gets
 * their own Stripe account, Stripe hosts the identity and bank collection, and
 * this application never sees either.
 *
 * Everything here runs with the caller's own session, so RLS already scopes the
 * profile write to the signed-in user. The service-role client is not involved.
 */

export type ConnectResult =
  | { ok: true; accountId: string }
  | { ok: false; message: string };

export type OnboardingLinkResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export type SyncResult =
  | { ok: true; account: StripeAccountRecord }
  | { ok: false; message: string };

/**
 * The account is created once and its id is stored on the profile. Calling this
 * again always returns the stored id — a second `accounts.create` would strand
 * the first account, half-onboarded, with no way back to it.
 */
export async function getOrCreateConnectAccount(
  userId: string,
  email: string | null,
): Promise<ConnectResult> {
  const existing = await getStripeAccount(userId);

  if (existing.accountId) {
    return { ok: true, accountId: existing.accountId };
  }

  let accountId: string;

  try {
    const account = await getStripe().accounts.create({
      email: email ?? undefined,

      // The Express preset, spelled out. `type: 'express'` is the older way to
      // say exactly this and is deprecated in the current API, so the same
      // configuration is set through `controller` instead: Stripe collects the
      // requirements and hosts the dashboard, and the platform carries the
      // Stripe fees and any negative balances.
      controller: {
        stripe_dashboard: { type: "express" },
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
      },

      // Card payments and transfers are what a payment link needs; without both
      // requested, onboarding completes but charges stay disabled.
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },

      // The country defaults to the platform account's own country. A
      // freelancer based elsewhere needs it set at creation time — it cannot be
      // changed afterwards — which is out of scope for v1 (docs/PRD.md §11).
      metadata: { user_id: userId },
    });

    accountId = account.id;
  } catch (error) {
    return {
      ok: false,
      message: stripeErrorMessage(error, "getOrCreateConnectAccount"),
    };
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase
    .from("profiles")
    .update({ stripe_account_id: accountId })
    .eq("id", userId);

  if (error) {
    // The account exists in Stripe but is not recorded here. Saying so is
    // better than silently creating a second one on the next attempt.
    console.error("Stripe account id could not be stored", { userId, error });

    return {
      ok: false,
      message:
        "Your Stripe account was created but could not be linked to your profile. Try again.",
    };
  }

  return { ok: true, accountId };
}

/**
 * A single-use, short-lived URL into Stripe's hosted flow.
 *
 * `account_onboarding` walks an unfinished account through what is still
 * missing; `account_update` is the right type once the account is live, and is
 * what the "Update details" button uses. Sending a finished account back into
 * onboarding shows them a dead end instead of their details.
 *
 * `refresh_url` is where Stripe sends the user when the link expired before
 * they used it; pointing it back at the settings screen means they simply press
 * the button again and get a fresh one.
 */
export async function createOnboardingLink(
  accountId: string,
  type: "account_onboarding" | "account_update" = "account_onboarding",
): Promise<OnboardingLinkResult> {
  const appUrl = await getAppUrl();

  try {
    const link = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/settings/payments`,
      return_url: `${appUrl}/api/stripe/connect/return`,
      type,
    });

    return { ok: true, url: link.url };
  } catch (error) {
    return {
      ok: false,
      message: stripeErrorMessage(error, "createOnboardingLink"),
    };
  }
}

/**
 * Re-reads the account from Stripe and caches the two flags the app actually
 * gates on. Called when the user returns from onboarding, and from the Refresh
 * button — `account.updated` webhooks keep them current after that, but only
 * once a webhook endpoint is configured.
 */
export async function syncAccountStatus(
  userId: string,
  accountId: string,
): Promise<SyncResult> {
  let chargesEnabled: boolean;
  let detailsSubmitted: boolean;

  try {
    const account = await getStripe().accounts.retrieve(accountId);

    chargesEnabled = account.charges_enabled;
    detailsSubmitted = account.details_submitted;
  } catch (error) {
    return { ok: false, message: stripeErrorMessage(error, "syncAccountStatus") };
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase
    .from("profiles")
    .update({
      stripe_charges_enabled: chargesEnabled,
      stripe_details_submitted: detailsSubmitted,
    })
    .eq("id", userId);

  if (error) {
    console.error("Stripe status could not be stored", { userId, error });

    return { ok: false, message: "Could not save your Stripe status. Try again." };
  }

  return {
    ok: true,
    account: {
      accountId,
      chargesEnabled,
      detailsSubmitted,
      state: stripeConnectionState({
        stripe_account_id: accountId,
        stripe_charges_enabled: chargesEnabled,
      }),
    },
  };
}
