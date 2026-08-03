import type {
  SortDirection,
  SortField,
  StatusFilter,
} from "@/lib/data/invoices";
import {
  SORT_DIRECTIONS,
  SORT_FIELDS,
  STATUS_FILTERS,
} from "@/lib/data/invoices";

/**
 * The invoice list's whole state lives in the URL: search, status filter, sort
 * and page. That keeps the list a plain Server Component — every control is an
 * ordinary link or a GET form, so there is no client state to synchronise and
 * every view is shareable and back-button-safe.
 */

export type InvoicesQuery = {
  q: string;
  status: StatusFilter;
  sort: SortField;
  dir: SortDirection;
  page: number;
};

export const DEFAULT_QUERY: InvoicesQuery = {
  q: "",
  status: "all",
  sort: "date",
  dir: "desc",
  page: 1,
};

function pick<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

/** Anything unrecognised silently falls back rather than erroring the page. */
export function parseInvoicesQuery(params: {
  [key: string]: string | string[] | undefined;
}): InvoicesQuery {
  const page = Number(typeof params.page === "string" ? params.page : "1");

  return {
    q: typeof params.q === "string" ? params.q.trim() : "",
    status: pick(params.status, STATUS_FILTERS, "all"),
    sort: pick(params.sort, SORT_FIELDS, "date"),
    dir: pick(params.dir, SORT_DIRECTIONS, "desc"),
    page: Number.isFinite(page) && page > 1 ? Math.trunc(page) : 1,
  };
}

/** A link back to the list with some of the query changed. */
export function invoicesHref(
  query: InvoicesQuery,
  overrides: Partial<InvoicesQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.status !== DEFAULT_QUERY.status) params.set("status", next.status);
  if (next.sort !== DEFAULT_QUERY.sort) params.set("sort", next.sort);
  if (next.dir !== DEFAULT_QUERY.dir) params.set("dir", next.dir);
  if (next.page > 1) params.set("page", String(next.page));

  const search = params.toString();

  return search ? `/invoices?${search}` : "/invoices";
}
