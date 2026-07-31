import type { Metadata } from "next";
import Link from "next/link";
import { RiAddLine, RiDashboardLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Placeholder } from "@/components/layout/placeholder";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user.email}.`}
        actions={
          <Button render={<Link href="/invoices/new" />}>
            <RiAddLine data-icon="inline-start" />
            New invoice
          </Button>
        }
      />
      <Placeholder
        icon={<RiDashboardLine />}
        title="Nothing to show yet"
        description="Outstanding totals, paid this month and recent invoices land here once invoices exist."
      />
    </>
  );
}
