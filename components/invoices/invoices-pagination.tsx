import Link from "next/link";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import {
  invoicesHref,
  type InvoicesQuery,
} from "@/components/invoices/invoices-query";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

/** 20 rows per page, newest first by default (docs/PRD.md §9). */
export function InvoicesPagination({
  query,
  page,
  pageCount,
}: {
  query: InvoicesQuery;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="ghost"
            disabled={!hasPrevious}
            nativeButton={false}
            render={
              hasPrevious ? (
                <Link
                  href={invoicesHref(query, { page: page - 1 })}
                  aria-label="Go to previous page"
                />
              ) : (
                <span aria-disabled="true" />
              )
            }
          >
            <RiArrowLeftSLine data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
          </Button>
        </PaginationItem>

        <PaginationItem>
          <span className="px-3 text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
        </PaginationItem>

        <PaginationItem>
          <Button
            variant="ghost"
            disabled={!hasNext}
            nativeButton={false}
            render={
              hasNext ? (
                <Link
                  href={invoicesHref(query, { page: page + 1 })}
                  aria-label="Go to next page"
                />
              ) : (
                <span aria-disabled="true" />
              )
            }
          >
            <span className="hidden sm:block">Next</span>
            <RiArrowRightSLine data-icon="inline-end" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
