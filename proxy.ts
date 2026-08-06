import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

/**
 * Routes reachable without a session. Everything else redirects to /login.
 *
 * This is an optimistic check only (docs/Tech.md §4.1). The real gate is
 * requireUser() in the authenticated layout, in every page and in every
 * Server Action.
 */
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/confirm",
  "/auth/auth-error",
  // Stripe posts here with no cookies. Redirecting it to /login would make
  // every delivery fail; the route authenticates the Stripe signature instead
  // of a session (docs/Tech.md §9.3). The Connect *return* URL is deliberately
  // not listed — a real user comes back through that one.
  "/api/stripe/webhook",
];

function isPublic(pathname: string) {
  // "/" routes itself: it forwards auth links and otherwise redirects by
  // session state, so it has to stay reachable while signed out.
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Carry the refreshed auth cookies over, or the refresh is thrown away.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
