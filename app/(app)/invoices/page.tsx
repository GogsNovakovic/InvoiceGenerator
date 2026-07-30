import type { Metadata } from "next";
import { RiFileList3Line } from "@remixicon/react";

import { Placeholder } from "@/components/layout/placeholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  await requireUser();

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Invoices
      </h1>
      <Placeholder
        icon={<RiFileList3Line />}
        title="No invoices yet"
        description="Creating, listing and sending invoices arrives with the invoice slice."
      />
    </>
  );
}
