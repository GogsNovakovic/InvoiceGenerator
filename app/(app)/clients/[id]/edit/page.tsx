import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth";
import { clientLabel, getClientById } from "@/lib/data/clients";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({
  params,
}: PageProps<"/clients/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;

  // Null covers "no such client" and "someone else's client" alike, so the
  // page cannot be used to discover which ids exist.
  const client = await getClientById(user.id, id);

  if (!client) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Edit client"
        description={`Changes apply to new invoices only. Invoices already issued to ${clientLabel(client)} keep the details they were created with.`}
      />
      <div className="max-w-xl">
        <ClientForm client={client} />
      </div>
    </>
  );
}
