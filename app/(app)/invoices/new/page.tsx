import type { Metadata } from "next";
import Link from "next/link";
import { RiUserSettingsLine } from "@remixicon/react";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getProfile, hasSenderDetails } from "@/lib/data/profile";
import { senderFromProfile } from "@/lib/invoice-view";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <>
      <PageHeader
        title="New invoice"
        description="The invoice number is assigned when you save."
      />

      {/* An empty From block is allowed — every profile field is optional —
          but it is almost never what the user meant. */}
      {!hasSenderDetails(profile) && (
        <Alert>
          <RiUserSettingsLine />
          <AlertTitle>Your sender details are empty</AlertTitle>
          <AlertDescription>
            <p>
              The From block is copied from your profile as the invoice is
              created, and cannot be changed on the invoice afterwards.
            </p>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/settings/profile" />}
            >
              Fill in your details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <InvoiceForm
        sender={senderFromProfile(profile)}
        defaultCurrency={profile?.default_currency ?? "EUR"}
      />
    </>
  );
}
