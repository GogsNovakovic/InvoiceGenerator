import type { Metadata } from "next";
import Link from "next/link";
import { RiAddLine, RiFileList3Line, RiSearchLine } from "@remixicon/react";

import { InvoicesFilters } from "@/components/invoices/invoices-filters";
import { InvoicesPagination } from "@/components/invoices/invoices-pagination";
import {
  invoicesHref,
  parseInvoicesQuery,
  type InvoicesQuery,
} from "@/components/invoices/invoices-query";
import { InvoicesTable } from "@/components/invoices/invoices-table";
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
import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/lib/data/invoices";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/invoices">) {
  const user = await requireUser();
  const query = parseInvoicesQuery(await searchParams);

  const { invoices, page, pageCount, totalCount } = await listInvoices(user.id, {
    query: query.q,
    status: query.status,
    sort: query.sort,
    direction: query.dir,
    page: query.page,
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Everything you have billed, newest first."
        actions={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            <RiAddLine data-icon="inline-start" />
            New invoice
          </Button>
        }
      />

      <InvoicesFilters query={query} />

      {invoices.length > 0 ? (
        <>
          <InvoicesTable invoices={invoices} />
          <InvoicesPagination query={query} page={page} pageCount={pageCount} />
        </>
      ) : (
        <InvoicesEmptyState query={query} page={page} count={totalCount} />
      )}
    </>
  );
}

function InvoicesEmptyState({
  query,
  page,
  count,
}: {
  query: InvoicesQuery;
  page: number;
  count: number;
}) {
  // A page beyond the last one, e.g. after deleting the only row on it.
  if (page > 1 && count > 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiFileList3Line />
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
            render={<Link href={invoicesHref(query, { page: 1 })} />}
          >
            Back to the first page
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (query.q || query.status !== "all") {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiSearchLine />
          </EmptyMedia>
          <EmptyTitle>No matching invoices</EmptyTitle>
          <EmptyDescription>
            {query.q
              ? `Nothing matched “${query.q}” under this filter.`
              : "No invoices have this status."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/invoices" />}
          >
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RiFileList3Line />
        </EmptyMedia>
        <EmptyTitle>No invoices yet</EmptyTitle>
        <EmptyDescription>
          Create your first invoice and it will appear here with its PDF.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/invoices/new" />}>
          <RiAddLine data-icon="inline-start" />
          New invoice
        </Button>
      </EmptyContent>
    </Empty>
  );
}
