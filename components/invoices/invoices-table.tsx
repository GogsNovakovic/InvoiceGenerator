import Link from "next/link";

import { InvoiceBadges } from "@/components/invoices/invoice-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvoiceListItem } from "@/lib/data/invoices";
import { formatDate } from "@/lib/dates";
import { formatCentsPlain } from "@/lib/money";

/**
 * The list rows from docs/PRD.md §9: number, client, dates, total, status.
 *
 * Row actions live on the detail screen rather than being repeated per row —
 * Send needs a recipient confirmation and Delete needs a warning, and both read
 * better once the user is looking at the invoice itself. The whole row is a
 * link there.
 */
export function InvoicesTable({ invoices }: { invoices: InvoiceListItem[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Invoice date</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="relative">
              <TableCell className="font-medium">
                {/* Stretched link: the whole row opens the invoice. */}
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="absolute inset-0 rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <span className="sr-only">
                    Open invoice {invoice.invoice_number}
                  </span>
                </Link>
                {invoice.invoice_number}
              </TableCell>
              <TableCell>{invoice.client_label}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(invoice.invoice_date)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(invoice.due_date)}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {formatCentsPlain(invoice.total_cents)} {invoice.currency}
              </TableCell>
              <TableCell>
                <InvoiceBadges
                  status={invoice.status}
                  isOverdue={invoice.is_overdue}
                  editedAfterSend={invoice.edited_after_send}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
