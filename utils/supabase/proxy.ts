import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseAuthCookie } from "./auth-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  // Captured up front: a failed refresh triggers `setAll`, which rewrites these
  // in place, so afterwards there is no way to tell what the browser actually
  // sent.
  const authCookieNames = request.cookies
    .getAll()
    .map(({ name }) => name)
    .filter(isSupabaseAuthCookie);

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshing the auth token. Do not add code between `createServerClient` and
  // `getUser()` — a mistake here makes sessions randomly log out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A dead session: auth cookies arrived but no longer resolve to a user,
  // because the refresh token was rejected. @supabase/ssr clears the session
  // cookie itself, but not dependably the `.0`/`.1` chunks or the PKCE
  // verifier — and whatever survives brings the same failed refresh round trip
  // back on the very next request. Expire the whole set instead.
  if (!user && authCookieNames.length > 0) {
    // Strip them from the in-flight request first, so nothing downstream
    // rebuilds a client around a refresh token already known to be dead.
    for (const name of authCookieNames) {
      request.cookies.delete(name);
    }

    // `NextResponse.next({ request })` snapshots the request, so the response
    // has to be rebuilt around the cleaned one — carrying over any Set-Cookie
    // the client already wrote.
    const cleared = NextResponse.next({ request });

    for (const cookie of supabaseResponse.cookies.getAll()) {
      cleared.cookies.set(cookie);
    }

    for (const name of authCookieNames) {
      cleared.cookies.set(name, "", { path: "/", maxAge: 0 });
    }

    supabaseResponse = cleared;
  }

  // The caller gets the user alongside the response so route protection costs
  // no extra round trip. If it returns a different response, it must copy the
  // cookies over first:
  // myResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  return { response: supabaseResponse, user };
};
