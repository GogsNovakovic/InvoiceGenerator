import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getStripeAccount } from "@/lib/data/profile";
import { syncAccountStatus } from "@/lib/stripe/connect";

/**
 * Where Stripe drops the user after hosted onboarding (docs/Tech.md §9.1).
 *
 * Stripe sends them here whether they finished or abandoned halfway, and the
 * redirect itself carries no proof of either — so the account is re-read from
 * Stripe and the two flags are cached before the settings screen renders. That
 * screen then shows the true state instead of assuming success.
 */
export async function GET() {
  const user = await requireUser();
  const account = await getStripeAccount(user.id);

  if (account.accountId) {
    const synced = await syncAccountStatus(user.id, account.accountId);

    if (!synced.ok) {
      // Not fatal: the settings screen still renders the last known state and
      // offers the Refresh button.
      console.error("Stripe return sync failed", {
        userId: user.id,
        message: synced.message,
      });
    }
  }

  redirect("/settings/payments");
}
