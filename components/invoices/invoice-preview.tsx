import { formatDate } from "@/lib/dates";
import {
  partyLabel,
  type InvoicePartyView,
  type InvoiceView,
} from "@/lib/invoice-view";
import {
  formatCentsPlain,
  formatPercent,
  formatQuantity,
} from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * The invoice as HTML, in the same order and from the same view model as the
 * PDF (docs/PRD.md §8). Every amount here was computed by the database and read
 * back — this component only formats.
 */

function PartyBlock({
  heading,
  party,
}: {
  heading: string;
  party: InvoicePartyView;
}) {
  const company = party.fullName ? party.companyName : null;

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        {heading}
      </p>
      <p className="mt-1 font-medium">{partyLabel(party)}</p>
      {company && <p className="text-sm text-muted-foreground">{company}</p>}
      {party.address && (
        <p className="text-sm whitespace-pre-line text-muted-foreground">
          {party.address}
        </p>
      )}
      {party.email && (
        <p className="text-sm text-muted-foreground">{party.email}</p>
      )}
      {party.website && (
        <p className="text-sm text-muted-foreground">{party.website}</p>
      )}
      {party.vatId && (
        <p className="text-sm text-muted-foreground">VAT ID: {party.vatId}</p>
      )}
    </div>
  );
}

export function InvoicePreview({ invoice }: { invoice: InvoiceView }) {
  const { currency } = invoice;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Invoice</h2>
          <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
        </div>
        <dl className="text-sm sm:text-right">
          <div className="flex gap-2 sm:justify-end">
            <dt className="text-muted-foreground">Invoice date</dt>
            <dd className="font-medium">{formatDate(invoice.invoiceDate)}</dd>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <dt className="text-muted-foreground">Due date</dt>
            <dd className="font-medium">{formatDate(invoice.dueDate)}</dd>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="font-medium">{currency}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <PartyBlock heading="FROM" party={invoice.sender} />
        <PartyBlock heading="BILL TO" party={invoice.client} />
      </div>

      {/* The table scrolls inside its own container rather than pushing the
          page sideways on a narrow screen. */}
      <div className="overflow-x-auto">
        <Table className="min-w-lg">
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">VAT</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="font-medium">
                  {line.description}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatQuantity(line.quantity, line.unitType)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCentsPlain(line.unitPriceCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(line.vatRateBps)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCentsPlain(line.lineSubtotalCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium tabular-nums">
              {formatCentsPlain(invoice.subtotalCents)} {currency}
            </dd>
          </div>
          {invoice.vatBreakdown.map((row) => (
            <div key={row.vatRateBps} className="flex justify-between">
              <dt className="text-muted-foreground">
                VAT {formatPercent(row.vatRateBps)}
              </dt>
              <dd className="font-medium tabular-nums">
                {formatCentsPlain(row.taxCents)} {currency}
              </dd>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold tabular-nums">
              {formatCentsPlain(invoice.totalCents)} {currency}
            </dd>
          </div>
        </dl>
      </div>

      {invoice.comments && (
        <div className="border-t pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            COMMENTS
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
            {invoice.comments}
          </p>
        </div>
      )}
    </div>
  );
}
