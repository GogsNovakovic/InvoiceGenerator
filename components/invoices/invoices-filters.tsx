import Link from "next/link";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiSearchLine,
} from "@remixicon/react";

import {
  invoicesHref,
  type InvoicesQuery,
} from "@/components/invoices/invoices-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SortField, StatusFilter } from "@/lib/data/invoices";

/**
 * Search, status filter and sort — all navigation, no client state.
 *
 * Changing any of them resets to page 1, because the row that was on page 3
 * under one filter is meaningless under another.
 */

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "not_paid", label: "Not paid" },
  { value: "overdue", label: "Overdue" },
];

const SORT_TABS: { value: SortField; label: string }[] = [
  { value: "date", label: "Invoice date" },
  { value: "total", label: "Total" },
];

export function InvoicesFilters({ query }: { query: InvoicesQuery }) {
  return (
    <div className="flex flex-col gap-3">
      {/* A plain GET form: submitting is an ordinary navigation, so search
          needs no client component. The other facets ride along as hidden
          fields so searching does not silently clear them. */}
      <form role="search" action="/invoices" className="flex max-w-md gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder="Search by invoice number or client"
          aria-label="Search invoices"
        />
        {query.status !== "all" && (
          <input type="hidden" name="status" value={query.status} />
        )}
        {query.sort !== "date" && (
          <input type="hidden" name="sort" value={query.sort} />
        )}
        {query.dir !== "desc" && (
          <input type="hidden" name="dir" value={query.dir} />
        )}
        <Button type="submit" variant="outline">
          <RiSearchLine data-icon="inline-start" />
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={query.status === tab.value ? "secondary" : "ghost"}
              nativeButton={false}
              render={
                <Link
                  href={invoicesHref(query, { status: tab.value, page: 1 })}
                  aria-current={query.status === tab.value ? "page" : undefined}
                />
              }
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-sm text-muted-foreground">Sort by</span>
          {SORT_TABS.map((tab) => {
            const isActive = query.sort === tab.value;
            // Clicking the active sort flips its direction; clicking the other
            // one switches field and starts from descending.
            const dir = isActive && query.dir === "desc" ? "asc" : "desc";

            return (
              <Button
                key={tab.value}
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
                nativeButton={false}
                render={
                  <Link
                    href={invoicesHref(query, {
                      sort: tab.value,
                      dir,
                      page: 1,
                    })}
                    aria-current={isActive ? "true" : undefined}
                  />
                }
              >
                {tab.label}
                {isActive &&
                  (query.dir === "desc" ? (
                    <RiArrowDownLine data-icon="inline-end" />
                  ) : (
                    <RiArrowUpLine data-icon="inline-end" />
                  ))}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
