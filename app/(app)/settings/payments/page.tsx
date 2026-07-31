import type { Metadata } from "next";
import { RiBankCardLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Placeholder } from "@/components/layout/placeholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Payments"
        description="Connect your own Stripe account to collect payment on your invoices."
      />
      <Placeholder
        icon={<RiBankCardLine />}
        title="Stripe not connected"
        description="Connecting your own Stripe account to collect payment arrives with the Stripe slice."
      />
    </>
  );
}
