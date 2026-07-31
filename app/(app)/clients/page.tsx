import type { Metadata } from "next";
import Link from "next/link";
import { RiAddLine, RiGroupLine, RiSearchLine } from "@remixicon/react";

import { ClientsPagination, clientsHref } from "@/components/clients/clients-pagination";
import { ClientsTable } from "@/components/clients/clients-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: PageProps<"/clients">) {
  const user = await requireUser();
  const params = await searchParams;

  const query = typeof params.q === "string" ? params.q.trim() : "";
  const requestedPage = Number(Array.isArray(params.page) ? "" : params.page);
  const page = Number.isFinite(requestedPage) && requestedPage > 1 ? requestedPage : 1;

  const { clients, page: currentPage, pageCount, totalCount } = await listClients(
    user.id,
    { query, page },
  );

  return (
    <>
      <PageHeader
        title="Clients"
        description="The people and companies you invoice."
        actions={
          <Button nativeButton={false} render={<Link href="/clients/new" />}>
            <RiAddLine data-icon="inline-start" />
            New client
          </Button>
        }
      />

      {/* A plain GET form: submitting is an ordinary navigation, so search
          needs no client component and naturally resets to page 1. */}
      <form role="search" action="/clients" className="flex max-w-md gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name, company or email"
          aria-label="Search clients"
        />
        <Button type="submit" variant="outline">
          <RiSearchLine data-icon="inline-start" />
          Search
        </Button>
      </form>

      {clients.length > 0 ? (
        <>
          <ClientsTable clients={clients} />
          <ClientsPagination
            page={currentPage}
            pageCount={pageCount}
            query={query}
          />
        </>
      ) : (
        <ClientsEmptyState query={query} page={currentPage} count={totalCount} />
      )}
    </>
  );
}

function ClientsEmptyState({
  query,
  page,
  count,
}: {
  query: string;
  page: number;
  count: number;
}) {
  // A page beyond the last one, e.g. after deleting the only row on it.
  if (page > 1 && count > 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiGroupLine />
          </EmptyMedia>
          <EmptyTitle>Nothing on this page</EmptyTitle>
          <EmptyDescription>
            This page is empty now. Go back to the start of the list.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={clientsHref(1, query)} />}
          >
            Back to the first page
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (query) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiSearchLine />
          </EmptyMedia>
          <EmptyTitle>No matching clients</EmptyTitle>
          <EmptyDescription>
            Nothing matched “{query}”. Try a different name, company or email.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/clients" />}>
            Clear search
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RiGroupLine />
        </EmptyMedia>
        <EmptyTitle>No clients yet</EmptyTitle>
        <EmptyDescription>
          Add your first client and you can start billing them.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/clients/new" />}>
          <RiAddLine data-icon="inline-start" />
          New client
        </Button>
      </EmptyContent>
    </Empty>
  );
}
