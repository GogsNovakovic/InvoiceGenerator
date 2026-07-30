"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/auth";
import {
  forgotPasswordSchema,
  resendConfirmationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { createClient } from "@/utils/supabase/server";

/**
 * Every action is a public POST endpoint (docs/Tech.md §4.5), so each one
 * re-validates its input with Zod on the server no matter what the form did.
 */

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; code?: "email_not_confirmed" };

function invalid(message: string, code?: "email_not_confirmed"): ActionResult {
  return { ok: false, message, code };
}

/**
 * Supabase returns 429 with a human-readable "try again in N seconds" message.
 * Passing it through is what makes the built-in rate limits visible to the user
 * instead of looking like a broken form.
 */
function isRateLimited(status?: number) {
  return status === 429;
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("Enter your email address and password.");
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return invalid(
        "Confirm your email address before signing in. Check your inbox for the confirmation link.",
        "email_not_confirmed",
      );
    }

    if (isRateLimited(error.status)) {
      return invalid(error.message);
    }

    // Deliberately identical for "no such account" and "wrong password" so the
    // form cannot be used to discover which addresses are registered.
    return invalid("Invalid email or password.");
  }

  redirect("/dashboard");
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Check the form.");
  }

  const supabase = createClient(await cookies());
  const appUrl = await getAppUrl();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${appUrl}/auth/confirm?next=/dashboard` },
  });

  if (error) {
    if (isRateLimited(error.status)) {
      return invalid(error.message);
    }

    return invalid(error.message || "Could not create the account.");
  }

  // Supabase deliberately succeeds without sending mail when the address is
  // already registered. The caller shows the same "check your inbox" screen
  // either way, which is what keeps registration non-enumerable.
  return { ok: true };
}

export async function resendConfirmation(input: unknown): Promise<ActionResult> {
  const parsed = resendConfirmationSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("Enter a valid email address.");
  }

  const supabase = createClient(await cookies());
  const appUrl = await getAppUrl();

  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${appUrl}/auth/confirm?next=/dashboard` },
  });

  // Always reported as success, failures included. Supabase only sends — and so
  // only rate limits — for addresses that actually have a pending confirmation,
  // so passing a 429 through here would tell an attacker which addresses those
  // are. Whether an address has a pending confirmation is not something this
  // endpoint should reveal.
  return { ok: true };
}

export async function requestPasswordReset(
  input: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("Enter a valid email address.");
  }

  const supabase = createClient(await cookies());
  const appUrl = await getAppUrl();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/confirm?next=/reset-password`,
  });

  // Identical response for a known address, an unknown one and a rate-limited
  // one. Supabase only sends mail for addresses that exist, so a 429 is only
  // ever produced by a registered address — surfacing it would turn this form
  // into a way to test which addresses have accounts.
  return { ok: true };
}

/**
 * Reached with the short-lived session that `/auth/confirm` established from
 * the recovery link, or by a signed-in user changing their own password.
 */
export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Check the form.");
  }

  await requireUser();

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "same_password") {
      return invalid("Choose a password you have not used before.");
    }

    return invalid(error.message || "Could not update the password.");
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();

  redirect("/login");
}
