import "server-only";

import { cookies } from "next/headers";

import { toCurrency, type Currency } from "@/lib/currency";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ProfileRecord = Pick<
  ProfileRow,
  | "id"
  | "full_name"
  | "company_name"
  | "email"
  | "address"
  | "vat_id"
  | "website"
> & { default_currency: Currency };

const PROFILE_COLUMNS =
  "id, full_name, company_name, email, address, vat_id, website, default_currency";

/**
 * The row is created by the signup trigger (docs/DB.md §6.1), so `null` here
 * means the row was deleted out from under a live session, not a missing
 * bootstrap. Callers treat it as "sign in again" rather than creating one.
 */
export async function getProfile(userId: string): Promise<ProfileRecord | null> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return { ...data, default_currency: toCurrency(data.default_currency) };
}

/**
 * The three connection states from docs/PRD.md §11.1. `charges_enabled` is the
 * one that matters — an account can have submitted every detail and still be
 * held for verification, and until Stripe says charges are enabled there is no
 * point offering a payment link.
 */
export type StripeConnectionState =
  | "not_connected"
  | "onboarding_incomplete"
  | "connected";

export type StripeAccountRecord = {
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  state: StripeConnectionState;
};

export function stripeConnectionState(account: {
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
}): StripeConnectionState {
  if (!account.stripe_account_id) {
    return "not_connected";
  }

  return account.stripe_charges_enabled ? "connected" : "onboarding_incomplete";
}

/**
 * The cached Stripe state on the profile, never a live Stripe call. It is kept
 * current by the onboarding return route and by `account.updated` webhooks
 * (docs/Tech.md §9.1), so screens read the database and stay fast.
 */
export async function getStripeAccount(
  userId: string,
): Promise<StripeAccountRecord> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "stripe_account_id, stripe_details_submitted, stripe_charges_enabled",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data ?? {
    stripe_account_id: null,
    stripe_details_submitted: false,
    stripe_charges_enabled: false,
  };

  return {
    accountId: row.stripe_account_id,
    detailsSubmitted: row.stripe_details_submitted,
    chargesEnabled: row.stripe_charges_enabled,
    state: stripeConnectionState(row),
  };
}

/** True once the profile carries enough to print a usable From block. */
export function hasSenderDetails(profile: ProfileRecord | null): boolean {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.full_name ?? profile.company_name ?? profile.email ?? profile.address,
  );
}
