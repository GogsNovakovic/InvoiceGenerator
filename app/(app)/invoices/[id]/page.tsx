import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  RiAlertLine,
  RiDownloadLine,
  RiEditLine,
  RiExternalLinkLine,
  RiFilePdf2Line,
} from "@remixicon/react";

import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import { InvoiceBadges } from "@/components/invoices/invoice-badges";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceStatusControl } from "@/components/invoices/invoice-status-control";
import { RegeneratePdfButton } from "@/components/invoices/regenerate-pdf-button";
import { SendHistory } from "@/components/invoices/send-history";
import { SendInvoiceDialog } from "@/components/invoices/send-invoice-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth";
import {
  canDeleteInvoice,
  canEditInvoice,
  getInvoiceDetail,
  isOverdue,
} from "@/lib/data/invoices";
import { getStripeAccount } from "@/lib/data/profile";
import { formatDate } from "@/lib/dates";
import { toInvoiceView } from "@/lib/invoice-view";
import { formatCents } from "@/lib/money";

export async function generateMetadata({
  params,
}: PageProps<"/invoices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const detail = await getInvoiceDetail(user.id, id);

  return { title: detail?.invoice.invoice_number ?? "Invoice" };
}

export default async function InvoiceDetailPage({
  params,
}: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const [detail, stripeAccount] = await Promise.all([
    getInvoiceDetail(user.id, id),
    getStripeAccount(user.id),
  ]);

  if (!detail) {
    notFound();
  }

  const { invoice, sends } = detail;
  const view = toInvoiceView(detail);
  const editable = canEditInvoice(invoice);
  const deletable = canDeleteInvoice(invoice);
  const hasPdf = Boolean(invoice.pdf_path);

  return (
    <>
      <PageHeader
        title={invoice.invoice_number}
        description={`${view.client.fullName ?? view.client.companyName ?? "—"} · ${formatCents(
          invoice.total_cents,
          invoice.currency,
        )} · due ${formatDate(invoice.due_date)}`}
        actions={
          <>
            <SendInvoiceDialog
              invoiceId={invoice.id}
              clientEmail={invoice.client_email}
              hasPdf={hasPdf}
              alreadySent={invoice.sent_at !== null}
              stripeReady={stripeAccount.chargesEnabled}
            />

            {hasPdf ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    // A normal download, not a client-side navigation.
                    download
                  />
                }
              >
                <RiDownloadLine data-icon="inline-start" />
                PDF
              </Button>
            ) : (
              <RegeneratePdfButton invoiceId={invoice.id} />
            )}

            {editable ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/invoices/${invoice.id}/edit`} />}
              >
                <RiEditLine data-icon="inline-start" />
                Edit
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} />}>
                  <Button variant="outline" disabled>
                    <RiEditLine data-icon="inline-start" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {invoice.stripe_confirmed_paid
                    ? "This invoice was paid through Stripe and can no longer be edited."
                    : "Mark this invoice as not paid before editing it."}
                </TooltipContent>
              </Tooltip>
            )}

            <DeleteInvoiceDialog
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoice_number}
              canDelete={deletable}
              stripeConfirmed={invoice.stripe_confirmed_paid}
              redirectTo="/invoices"
            />
          </>
        }
      />

      {/* Set by the Stripe webhook when a payment does not equal the total.
          The invoice stays unpaid and the user resolves it (docs/PRD.md §11.4). */}
      {invoice.payment_mismatch && (
        <Alert variant="destructive">
          <RiAlertLine />
          <AlertTitle>Payment amount mismatch</AlertTitle>
          <AlertDescription>
            {formatCents(
              invoice.amount_received_cents ?? 0,
              invoice.currency,
            )}{" "}
            received, {formatCents(invoice.total_cents, invoice.currency)} due.
            This invoice has been left as not paid.
          </AlertDescription>
        </Alert>
      )}

      {!hasPdf && (
        <Alert>
          <RiFilePdf2Line />
          <AlertTitle>This invoice has no PDF</AlertTitle>
          <AlertDescription>
            The invoice itself is saved. Generating its PDF did not succeed, so
            it cannot be downloaded or emailed until you regenerate it.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <InvoiceBadges
          status={invoice.status}
          isOverdue={isOverdue(invoice)}
          editedAfterSend={invoice.edited_after_send}
        />
        <InvoiceStatusControl invoiceId={invoice.id} status={invoice.status} />
      </div>

      {/* Created once, for the total at the time (docs/PRD.md §11.2), and shown
          here as well as in the email so the user can send it any other way. */}
      {invoice.stripe_payment_link_url && (
        <Card>
          <CardHeader>
            <CardTitle>Payment link</CardTitle>
            <CardDescription>
              Your client can pay this invoice with a card here. The link keeps
              the amount it was created with, and paying it marks the invoice as
              paid.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
              {invoice.stripe_payment_link_url}
            </code>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={invoice.stripe_payment_link_url}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <RiExternalLinkLine data-icon="inline-start" />
              Open
            </Button>
          </CardContent>
        </Card>
      )}

      <InvoicePreview invoice={view} />

      <Card>
        <CardHeader>
          <CardTitle>Send history</CardTitle>
          <CardDescription>
            Every attempt to email this invoice, successful or not.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SendHistory sends={sends} />
        </CardContent>
      </Card>
    </>
  );
}
