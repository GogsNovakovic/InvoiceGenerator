import { Badge } from "@/components/ui/badge";

/**
 * The row and header badges from docs/PRD.md §9. Status is always shown;
 * Overdue and Edited after sending are additional and can appear together.
 */
export function InvoiceStatusBadge({ status }: { status: "not_paid" | "paid" }) {
  return status === "paid" ? (
    <Badge variant="default">Paid</Badge>
  ) : (
    <Badge variant="secondary">Not paid</Badge>
  );
}

export function OverdueBadge() {
  return <Badge variant="destructive">Overdue</Badge>;
}

export function EditedAfterSendBadge() {
  return <Badge variant="outline">Edited after sending</Badge>;
}

export function InvoiceBadges({
  status,
  isOverdue,
  editedAfterSend,
}: {
  status: "not_paid" | "paid";
  isOverdue: boolean;
  editedAfterSend: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <InvoiceStatusBadge status={status} />
      {isOverdue && <OverdueBadge />}
      {editedAfterSend && <EditedAfterSendBadge />}
    </div>
  );
}
