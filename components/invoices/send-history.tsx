import { RiCheckLine, RiCloseLine } from "@remixicon/react";

import type { InvoiceSend } from "@/lib/data/invoices";
import { formatDateTime } from "@/lib/dates";

/**
 * Every send attempt, successful or not, with the provider's own error message
 * on a failure (docs/PRD.md §12). The table is append-only in the database —
 * there is no update or delete policy on it — so this is the record.
 */
export function SendHistory({ sends }: { sends: InvoiceSend[] }) {
  if (sends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This invoice has not been sent yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {sends.map((send) => (
        <li key={send.id} className="flex gap-3 text-sm">
          <span
            className={
              send.status === "sent"
                ? "mt-0.5 text-muted-foreground"
                : "mt-0.5 text-destructive"
            }
            aria-hidden="true"
          >
            {send.status === "sent" ? (
              <RiCheckLine className="size-4" />
            ) : (
              <RiCloseLine className="size-4" />
            )}
          </span>
          <div className="flex flex-col">
            <span>
              {send.status === "sent" ? "Sent to" : "Failed to send to"}{" "}
              <span className="font-medium">{send.to_email}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(send.created_at)} UTC
            </span>
            {send.error_message && (
              <span className="text-xs text-destructive">
                {send.error_message}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
