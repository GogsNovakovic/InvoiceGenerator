import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Link problem" };

const reasons: Record<string, string> = {
  expired:
    "That link has expired or has already been used. Request a fresh one and try again.",
  missing:
    "That link is missing the information needed to confirm it. Open the most recent email and use the link there.",
  mismatch:
    "That link was opened in a different browser from the one that requested it. Open it in the browser you signed up from, or request a new link.",
};

export default async function AuthErrorPage(
  props: PageProps<"/auth/auth-error">,
) {
  const { reason } = await props.searchParams;
  const key = typeof reason === "string" ? reason : "expired";

  return (
    <Card>
      <CardHeader>
        <CardTitle>This link did not work</CardTitle>
        <CardDescription>{reasons[key] ?? reasons.expired}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button nativeButton={false} render={<Link href="/login" />}>
          Back to sign in
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/forgot-password" />}
        >
          Request a new link
        </Button>
      </CardContent>
    </Card>
  );
}
