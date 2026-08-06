import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * The service-role client. It bypasses RLS completely, so it exists for exactly
 * one caller: the Stripe webhook, which arrives with no cookies and therefore no
 * `auth.uid()` to filter by (docs/Tech.md §9.3).
 *
 * Two guardrails around that blast radius:
 *
 * - `server-only` fails the build if this module is ever pulled into a client
 *   bundle, rather than shipping a full-database key to a browser.
 * - The key is read lazily, so a build without `SUPABASE_SERVICE_ROLE_KEY` in
 *   the environment still succeeds — only an actual webhook delivery fails.
 *
 * Every query made through it names an explicit id. It is never used to serve a
 * page, an action, or anything else a signed-in user can reach.
 */
let client: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function getAdminClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set — the Stripe webhook cannot write.",
      );
    }

    client = createSupabaseClient<Database>(url, key, {
      // There is no user and no browser here: nothing to persist, nothing to
      // refresh, and no session to accidentally pick up from a cookie.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}
