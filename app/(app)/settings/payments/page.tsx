import type { Metadata } from "next";
import { RiBankCardLine } from "@remixicon/react";

import { Placeholder } from "@/components/layout/placeholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  await requireUser();

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Payments
      </h1>
      <Placeholder
        icon={<RiBankCardLine />}
        title="Stripe not connected"
        description="Connecting your own Stripe account to collect payment arrives with the Stripe slice."
      />
    </>
  );
}
