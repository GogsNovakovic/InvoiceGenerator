import type { Metadata } from "next";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="New client"
        description="Add someone you invoice. You can edit these details later."
      />
      <div className="max-w-xl">
        <ClientForm />
      </div>
    </>
  );
}
