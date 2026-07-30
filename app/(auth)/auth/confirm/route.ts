import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { safeNextPath } from "@/lib/app-url";
import { createClient } from "@/utils/supabase/server";

/**
 * The single landing point for every link Supabase Auth emails — signup
 * confirmation and password recovery today.
 *
 * It accepts both shapes a link can arrive in:
 *
 *   token_hash + type  the shape produced when the email template is
 *                      customised to `{{ .TokenHash }}`. Verified with
 *                      `verifyOtp`, so it works in any browser on any device.
 *   code               the shape Supabase's stock template produces. Verified
 *                      with `exchangeCodeForSession`, which needs the PKCE
 *                      verifier cookie and therefore only works in the browser
 *                      that started the flow.
 *
 * Both end with a real session in cookies before the redirect happens.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const redirectTo = (pathname: string, reason?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";

    if (reason) {
      url.searchParams.set("reason", reason);
    }

    return NextResponse.redirect(url);
  };

  // Supabase reports a rejected link by redirecting back with its own error
  // parameters rather than a token.
  if (searchParams.get("error")) {
    const errorCode = searchParams.get("error_code");
    return redirectTo(
      "/auth/auth-error",
      errorCode === "otp_expired" ? "expired" : "missing",
    );
  }

  if (!tokenHash && !code) {
    return redirectTo("/auth/auth-error", "missing");
  }

  const supabase = createClient(await cookies());

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    return error
      ? redirectTo("/auth/auth-error", "expired")
      : redirectTo(next);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    return error
      ? redirectTo("/auth/auth-error", "mismatch")
      : redirectTo(next);
  }

  return redirectTo("/auth/auth-error", "missing");
}
