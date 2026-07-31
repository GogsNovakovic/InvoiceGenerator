import type { Metadata } from "next";
import Link from "next/link";
import { RiAddLine, RiFileList3Line } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Placeholder } from "@/components/layout/placeholder";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Invoices"
        actions={
          <Button render={<Link href="/invoices/new" />}>
            <RiAddLine data-icon="inline-start" />
            New invoice
          </Button>
        }
      />
      <Placeholder
        icon={<RiFileList3Line />}
        title="No invoices yet"
        description="Creating, listing and sending invoices arrives with the invoice slice."
      />
    </>
  );
}
