"use client";

import { useState } from "react";
import { RiExternalLinkLine, RiRefreshLine } from "@remixicon/react";
import { toast } from "sonner";

import {
  refreshStripeStatusAction,
  startStripeOnboardingAction,
} from "@/lib/actions/stripe";
import type { StripeConnectionState } from "@/lib/data/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

/**
 * The Settings → Payments card: the connection state and the one button that
 * moves it forward (docs/PRD.md §11.1).
 *
 * Onboarding itself is Stripe's hosted flow, so this screen never asks for an
 * identity document or a bank account — it hands the user to Stripe and reads
 * back what Stripe says afterwards.
 */
const COPY: Record<
  StripeConnectionState,
  { badge: string; title: string; description: string; action: string }
> = {
  not_connected: {
    badge: "Not connected",
    title: "Collect payment on your invoices",
    description:
      "Connect your own Stripe account and every invoice you create gets a payment link for its exact total. The money goes straight to you — it never passes through this application, and no fee is taken.",
    action: "Connect Stripe",
  },
  onboarding_incomplete: {
    badge: "Onboarding incomplete",
    title: "Stripe still needs a few details",
    description:
      "Your Stripe account exists but is not cleared to accept charges yet. Pick up where you left off — Stripe remembers what you already entered. Verification can also take a little while after you finish.",
    action: "Resume onboarding",
  },
  connected: {
    badge: "Connected",
    title: "Your Stripe account is ready",
    description:
      "New invoices carry a payment link for their exact total, and paying one marks the invoice as paid automatically.",
    action: "Update details on Stripe",
  },
};

export function StripeConnectCard({ state }: { state: StripeConnectionState }) {
  const [isStarting, setIsStarting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[state];

  async function onStart() {
    setError(null);
    setIsStarting(true);

    const result = await startStripeOnboardingAction();

    if (!result.ok) {
      setIsStarting(false);
      setError(result.message);
      return;
    }

    // A full page navigation, not a router push: the destination is Stripe's
    // own domain. The spinner is deliberately left running until it happens.
    window.location.href = result.url;
  }

  async function onRefresh() {
    setError(null);
    setIsRefreshing(true);

    const result = await refreshStripeStatusAction();

    setIsRefreshing(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    toast.success("Stripe status refreshed.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{copy.title}</CardTitle>
          <Badge variant={state === "connected" ? "default" : "secondary"}>
            {copy.badge}
          </Badge>
        </div>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>

      {error && (
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}

      <CardFooter className="flex flex-wrap gap-2">
        <Button disabled={isStarting} onClick={onStart}>
          {isStarting ? (
            <Spinner />
          ) : (
            <RiExternalLinkLine data-icon="inline-start" />
          )}
          {copy.action}
        </Button>

        {state !== "not_connected" && (
          <Button variant="outline" disabled={isRefreshing} onClick={onRefresh}>
            {isRefreshing ? (
              <Spinner />
            ) : (
              <RiRefreshLine data-icon="inline-start" />
            )}
            Refresh status
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
