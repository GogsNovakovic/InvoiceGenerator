import type { Metadata } from "next";
import Link from "next/link";
import { RiAddLine, RiGroupLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Placeholder } from "@/components/layout/placeholder";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Clients"
        actions={
          <Button nativeButton={false} render={<Link href="/clients/new" />}>
            <RiAddLine data-icon="inline-start" />
            New client
          </Button>
        }
      />
      <Placeholder
        icon={<RiGroupLine />}
        title="No clients yet"
        description="Adding, editing and searching clients arrives with the clients slice."
      />
    </>
  );
}
