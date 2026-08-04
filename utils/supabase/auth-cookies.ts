/**
 * Which cookies make up a Supabase auth session.
 *
 * Matched by prefix rather than by hardcoded project ref, so this keeps working
 * if the Supabase project changes. Covers all three shapes @supabase/ssr writes:
 *
 *   sb-<ref>-auth-token                 the session
 *   sb-<ref>-auth-token.0 / .1 / ...    chunks, once the session exceeds ~3180 bytes
 *   sb-<ref>-auth-token-code-verifier   the PKCE verifier
 *
 * Clearing only the first of these is what lets a dead session come back: a
 * surviving chunk is enough for the next request to retry a refresh token that
 * is already known to be dead.
 */
export const isSupabaseAuthCookie = (name: string) =>
  name.startsWith("sb-") && name.includes("-auth-token");
