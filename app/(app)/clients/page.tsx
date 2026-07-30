import type { Metadata } from "next";
import { RiGroupLine } from "@remixicon/react";

import { Placeholder } from "@/components/layout/placeholder";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  await requireUser();

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Clients
      </h1>
      <Placeholder
        icon={<RiGroupLine />}
        title="No clients yet"
        description="Adding, editing and searching clients arrives with the clients slice."
      />
    </>
  );
}
