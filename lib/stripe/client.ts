import "server-only";

import Stripe from "stripe";

/**
 * The Stripe SDK singleton. `STRIPE_SECRET_KEY` is reachable from this module
 * and nowhere else (docs/Tech.md §11), and `server-only` makes an accidental
 * client import a build error rather than a leaked key.
 *
 * Lazy for the same reason as the Resend client: a build in an environment
 * without the key must still succeed.
 *
 * No `apiVersion` is pinned here on purpose — the SDK sends the version it was
 * built and typed against, so the request and the TypeScript types can never
 * disagree. Pinning a different literal is what breaks that.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set — check .env.local");
    }

    client = new Stripe(key, {
      appInfo: { name: "Invoice Generator" },
    });
  }

  return client;
}

/** Lets a screen say "not configured" instead of throwing on first render. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Stripe's own errors carry a message written for the person who has to act on
 * it ("Your account cannot currently make live charges"), so it is passed
 * through rather than replaced with something vaguer. Anything else is a bug on
 * our side and gets a generic message plus a server-side log.
 */
export function stripeErrorMessage(error: unknown, context: string): string {
  if (error instanceof Stripe.errors.StripeError) {
    console.error(`${context}: Stripe error`, {
      type: error.type,
      code: error.code,
      message: error.message,
    });

    return error.message;
  }

  console.error(`${context}: unexpected error`, error);

  return "Stripe could not be reached. Try again.";
}
