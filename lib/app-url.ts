import "server-only";

import { headers } from "next/headers";

/**
 * Absolute origin for links that leave the app — Supabase auth emails today,
 * Stripe return URLs later. Prefers the configured value and falls back to the
 * request's own host so local development works without extra setup.
 */
export async function getAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

/**
 * Only ever redirect to a path inside this app. `//evil.com` is a valid URL to
 * the browser, so a leading double slash has to be rejected too.
 */
export function safeNextPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
