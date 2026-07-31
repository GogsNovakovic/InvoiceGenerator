import Link from "next/link";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

export function clientsHref(page: number, query: string) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();

  return search ? `/clients?${search}` : "/clients";
}

export function ClientsPagination({
  page,
  pageCount,
  query,
}: {
  page: number;
  pageCount: number;
  query: string;
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
                  href={clientsHref(page - 1, query)}
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
                  href={clientsHref(page + 1, query)}
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
