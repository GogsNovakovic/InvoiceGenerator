import type { Metadata } from "next";
import { RiUserSettingsLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Placeholder } from "@/components/layout/placeholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Profile"
        description="These details form the From block on every invoice."
      />
      <Placeholder
        icon={<RiUserSettingsLine />}
        title="Sender details"
        description="The From block on your invoices and your default currency arrive with the profile slice."
      />
    </>
  );
}
