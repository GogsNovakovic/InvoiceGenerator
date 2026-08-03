import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  // The row is created by the signup trigger (docs/DB.md §6.1), so a missing
  // one means the account disappeared underneath a live session.
  if (!profile) {
    redirect("/login");
  }

  return (
    <>
      <PageHeader
        title="Profile"
        description="These details form the From block on every invoice you create from now on."
      />
      <div className="max-w-xl">
        <ProfileForm profile={profile} />
      </div>
    </>
  );
}
