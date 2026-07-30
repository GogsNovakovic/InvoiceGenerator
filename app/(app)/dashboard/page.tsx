import type { Metadata } from "next";
import { RiDashboardLine } from "@remixicon/react";

import { Placeholder } from "@/components/layout/placeholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email}.
        </p>
      </div>
      <Placeholder
        icon={<RiDashboardLine />}
        title="Nothing to show yet"
        description="Outstanding totals, paid this month and recent invoices land here once invoices exist."
      />
    </>
  );
}
