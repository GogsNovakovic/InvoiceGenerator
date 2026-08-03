/**
 * Dates in this app are calendar dates (`date` columns, `<input type="date">`),
 * never instants. Everything here works on the `YYYY-MM-DD` string and formats
 * in UTC, so an invoice dated the 1st never renders as the 31st for a user west
 * of Greenwich.
 */

export const DUE_DATE_OFFSET_DAYS = 15;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/** The default due date from docs/PRD.md §7.1: invoice date + 15 days. */
export function defaultDueDate(invoiceDate: string): string {
  return addDays(invoiceDate, DUE_DATE_OFFSET_DAYS);
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) {
    return "—";
  }

  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

/** For the send log, where the exact moment matters rather than the day. */
export function formatDateTime(isoTimestamp: string | null): string {
  if (!isoTimestamp) {
    return "—";
  }

  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}
