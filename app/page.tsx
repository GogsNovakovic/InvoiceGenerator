import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";

/**
 * There is no marketing page: the root is a router (PRD §4).
 *
 * It also forwards auth links to /auth/confirm. Supabase's stock email
 * templates redirect to the project's Site URL rather than to a path we choose,
 * so a confirmation can land here with its token still attached.
 */
const AUTH_PARAMS = [
  "token_hash",
  "type",
  "code",
  "next",
  "error",
  "error_code",
  "error_description",
] as const;

export default async function RootPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const forwarded = new URLSearchParams();

  for (const key of AUTH_PARAMS) {
    const value = searchParams[key];

    if (typeof value === "string") {
      forwarded.set(key, value);
    }
  }

  if (
    forwarded.has("token_hash") ||
    forwarded.has("code") ||
    forwarded.has("error")
  ) {
    redirect(`/auth/confirm?${forwarded.toString()}`);
  }

  redirect((await getUser()) ? "/dashboard" : "/login");
}
