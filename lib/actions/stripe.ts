"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/lib/auth";
import { getProfile, getStripeAccount } from "@/lib/data/profile";
import { isStripeConfigured } from "@/lib/stripe/client";
import {
  createOnboardingLink,
  getOrCreateConnectAccount,
  syncAccountStatus,
} from "@/lib/stripe/connect";

/**
 * Connecting a Stripe account, from the Settings → Payments screen.
 *
 * Same shape as every other action in this codebase (docs/Tech.md §4.5): the
 * caller is authenticated here, not trusted from the page that rendered the
 * button, and the account id always comes from the signed-in user's own profile
 * rather than from anything the client sent.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

export type OnboardingResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

function invalid(message: string) {
  return { ok: false as const, message };
}

const NOT_CONFIGURED =
  "Stripe is not configured on this server yet. Add STRIPE_SECRET_KEY and try again.";

/**
 * Starts onboarding, or resumes it — Stripe's hosted flow picks up wherever the
 * account left off, so there is one action behind both buttons.
 *
 * The URL is returned rather than redirected to, so a failure can be shown on
 * the screen the user is already on instead of bouncing them somewhere.
 */
export async function startStripeOnboardingAction(): Promise<OnboardingResult> {
  const user = await requireUser();

  if (!isStripeConfigured()) {
    return invalid(NOT_CONFIGURED);
  }

  const [profile, existing] = await Promise.all([
    getProfile(user.id),
    getStripeAccount(user.id),
  ]);

  const account = await getOrCreateConnectAccount(
    user.id,
    profile?.email ?? user.email ?? null,
  );

  if (!account.ok) {
    return invalid(account.message);
  }

  // An account that already accepts charges has nothing left to onboard — it
  // gets the update flow instead, so the button means what it says.
  const link = await createOnboardingLink(
    account.accountId,
    existing.state === "connected" ? "account_update" : "account_onboarding",
  );

  if (!link.ok) {
    return invalid(link.message);
  }

  return { ok: true, url: link.url };
}

/**
 * Re-reads the account from Stripe on demand.
 *
 * `account.updated` webhooks do this automatically, but only once a webhook
 * endpoint exists — before then, and whenever onboarding was finished in
 * another tab, this button is how the screen catches up.
 */
export async function refreshStripeStatusAction(): Promise<ActionResult> {
  const user = await requireUser();

  if (!isStripeConfigured()) {
    return invalid(NOT_CONFIGURED);
  }

  const account = await getStripeAccount(user.id);

  if (!account.accountId) {
    return invalid("Connect a Stripe account first.");
  }

  const synced = await syncAccountStatus(user.id, account.accountId);

  if (!synced.ok) {
    return invalid(synced.message);
  }

  refresh();

  return { ok: true };
}
