import type { Metadata } from "next";
import { RiInformationLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { StripeConnectCard } from "@/components/payments/stripe-connect-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth";
import { getStripeAccount } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  const user = await requireUser();
  const account = await getStripeAccount(user.id);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Connect your own Stripe account to collect payment on your invoices."
      />

      <div className="max-w-xl">
        <StripeConnectCard state={account.state} />
      </div>

      {/* The gap between "details submitted" and "charges enabled" is where
          users get confused: the flow looks finished, but Stripe is still
          verifying and no link can be created yet (docs/PRD.md §11.1). */}
      {account.detailsSubmitted && !account.chargesEnabled && (
        <Alert className="max-w-xl">
          <RiInformationLine />
          <AlertTitle>Stripe is still reviewing your account</AlertTitle>
          <AlertDescription>
            You have submitted everything Stripe asked for. Until it finishes
            verifying, charges stay disabled and new invoices are created
            without a payment link. Everything else — invoices, PDFs, email —
            keeps working.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
