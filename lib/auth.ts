import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/server";

/**
 * The authoritative auth check. `getUser()` revalidates the token against the
 * Supabase Auth server on every call — never swap it for `getSession()`, which
 * only reads the cookie and trusts whatever is in it (docs/Tech.md §6).
 *
 * Wrapped in React `cache` so the shell, the page and any nested component
 * share one round trip per request.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
});

/**
 * Use in the authenticated layout, in every data function and at the top of
 * every Server Action. The proxy redirect is optimistic only; this is the gate.
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
