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

/** True once the profile carries enough to print a usable From block. */
export function hasSenderDetails(profile: ProfileRecord | null): boolean {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.full_name ?? profile.company_name ?? profile.email ?? profile.address,
  );
}
