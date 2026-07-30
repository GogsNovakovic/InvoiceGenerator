import type { Metadata } from "next";
import { RiUserSettingsLine } from "@remixicon/react";

import { Placeholder } from "@/components/layout/placeholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  await requireUser();

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Profile
      </h1>
      <Placeholder
        icon={<RiUserSettingsLine />}
        title="Sender details"
        description="The From block on your invoices and your default currency arrive with the profile slice."
      />
    </>
  );
}
