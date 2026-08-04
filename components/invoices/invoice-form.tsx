"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { ClientCombobox } from "@/components/clients/client-combobox";
import {
  EMPTY_LINE,
  LineItemsEditor,
} from "@/components/invoices/line-items-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createInvoiceAction, updateInvoiceAction } from "@/lib/actions/invoices";
import { sendInvoiceAction } from "@/lib/actions/send";
import { CURRENCIES, type Currency } from "@/lib/currency";
import type { ClientOption } from "@/lib/data/clients";
import { defaultDueDate, todayISO } from "@/lib/dates";
import { calculateFormTotals } from "@/lib/invoice-totals";
import { partyLabel, type InvoicePartyView } from "@/lib/invoice-view";
import { formatCentsPlain, formatPercent } from "@/lib/money";
import {
  invoiceSchema,
  type InvoiceFormValues,
  type LineItemFormValues,
} from "@/lib/validation/invoice";

/**
 * Create and edit share this form, because the two differ in three details
 * only: the invoice number is assigned rather than shown, the action called,
 * and the resend prompt that an edit can raise (docs/PRD.md §12.1).
 *
 * Totals shown here are the live mirror in lib/invoice-totals.ts. The stored
 * totals come from the database trigger, so what lands on the saved invoice is
 * the database's arithmetic, not this component's (docs/Tech.md §7).
 */

export type InvoiceFormInvoice = {
  id: string;
  invoiceNumber: string;
  client: ClientOption | null;
  values: InvoiceFormValues;
  sentAt: string | null;
};

export function InvoiceForm({
  sender,
  defaultCurrency,
  invoice,
}: {
  sender: InvoicePartyView;
  defaultCurrency: Currency;
  invoice?: InvoiceFormInvoice;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    invoice?.client ?? null,
  );
  // Set after a successful edit of an invoice that had already been emailed.
  const [resendFor, setResendFor] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const today = todayISO();

  // `raw: true` keeps the untransformed string fields. Without it the resolver
  // hands `handleSubmit` the schema's *output* — cents, basis points, renamed
  // keys — and the action, which validates the same schema again, would be
  // parsing its own output and reject every save (docs/Tech.md §4.5: the client
  // sends the change, the server does the authoritative transform).
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema, undefined, { raw: true }),
    defaultValues: invoice?.values ?? {
      client_id: "",
      invoice_date: today,
      due_date: defaultDueDate(today),
      currency: defaultCurrency,
      comments: "",
      line_items: [EMPTY_LINE],
    },
  });

  const { errors, isSubmitting, dirtyFields } = form.formState;

  // `useWatch` rather than `form.watch`: the latter hands back a fresh function
  // on every render, which opts the whole component out of React Compiler's
  // memoization.
  const currency = (useWatch({ control: form.control, name: "currency" }) ??
    defaultCurrency) as Currency;
  const lines = (useWatch({ control: form.control, name: "line_items" }) ??
    []) as LineItemFormValues[];
  const totals = calculateFormTotals(lines);

  function onClientChange(client: ClientOption | null) {
    setSelectedClient(client);
    form.setValue("client_id", client?.id ?? "", { shouldValidate: true });
  }

  function goToInvoice(invoiceId: string) {
    router.push(`/invoices/${invoiceId}`);
  }

  async function onSubmit(values: InvoiceFormValues) {
    setFormError(null);

    const result = invoice
      ? await updateInvoiceAction(invoice.id, values)
      : await createInvoiceAction(values);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // The invoice itself is saved; only its PDF is missing, and the detail
    // screen offers a Regenerate button for it (docs/PRD.md §8).
    if (result.pdfWarning) {
      toast.warning(`${result.pdfWarning} You can regenerate it from the invoice.`);
    } else {
      toast.success(invoice ? "Invoice saved." : "Invoice created.");
    }

    if (result.wasSent) {
      setResendFor(result.invoiceId);
      return;
    }

    goToInvoice(result.invoiceId);
  }

  async function onResend() {
    if (!resendFor) {
      return;
    }

    setIsResending(true);
    const result = await sendInvoiceAction(resendFor);
    setIsResending(false);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success("Invoice resent.");
    }

    goToInvoice(resendFor);
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Read-only: the From block comes from the profile and is frozen
                onto the invoice when it is created (docs/PRD.md §7.1). */}
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                FROM
              </p>
              <p className="mt-1 font-medium">{partyLabel(sender)}</p>
              {sender.fullName && sender.companyName && (
                <p className="text-sm text-muted-foreground">
                  {sender.companyName}
                </p>
              )}
              {sender.address && (
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {sender.address}
                </p>
              )}
              {sender.email && (
                <p className="text-sm text-muted-foreground">{sender.email}</p>
              )}
              {sender.vatId && (
                <p className="text-sm text-muted-foreground">
                  VAT ID: {sender.vatId}
                </p>
              )}
              <FieldDescription className="mt-3">
                {invoice
                  ? "Frozen when this invoice was created."
                  : "From your profile. Change it in Settings → Profile."}
              </FieldDescription>
            </div>

            <Field data-invalid={Boolean(errors.client_id)}>
              <FieldLabel htmlFor="client_id">Bill to</FieldLabel>
              <ClientCombobox
                value={selectedClient}
                onChange={onClientChange}
                placeholder="Search your clients…"
              />
              <input type="hidden" {...form.register("client_id")} />
              <FieldDescription>
                {invoice
                  ? "Choosing a different client re-copies their details onto this invoice."
                  : "The client's details are copied onto the invoice as you save it."}
              </FieldDescription>
              <FieldError errors={[errors.client_id]} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={Boolean(errors.invoice_date)}>
              <FieldLabel htmlFor="invoice_date">Invoice date</FieldLabel>
              <Input
                id="invoice_date"
                type="date"
                aria-invalid={Boolean(errors.invoice_date)}
                {...form.register("invoice_date", {
                  // The due date follows the invoice date until the user takes
                  // it over, at which point their value is left alone.
                  onChange: (event) => {
                    if (!dirtyFields.due_date) {
                      form.setValue(
                        "due_date",
                        defaultDueDate(event.target.value),
                      );
                    }
                  },
                })}
              />
              <FieldError errors={[errors.invoice_date]} />
            </Field>

            <Field data-invalid={Boolean(errors.due_date)}>
              <FieldLabel htmlFor="due_date">Due date</FieldLabel>
              <Input
                id="due_date"
                type="date"
                aria-invalid={Boolean(errors.due_date)}
                {...form.register("due_date")}
              />
              <FieldError errors={[errors.due_date]} />
            </Field>

            <Field data-invalid={Boolean(errors.currency)}>
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <NativeSelect
                id="currency"
                className="w-full"
                aria-invalid={Boolean(errors.currency)}
                {...form.register("currency")}
              >
                {CURRENCIES.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {option}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.currency]} />
            </Field>
          </div>

          <Field>
            <FieldLabel>Line items</FieldLabel>
            <LineItemsEditor form={form} currency={currency} />
            {errors.line_items?.root && (
              <FieldError errors={[errors.line_items.root]} />
            )}
            {errors.line_items?.message && (
              <FieldError errors={[{ message: errors.line_items.message }]} />
            )}
          </Field>

          <div className="flex justify-end">
            <dl className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium tabular-nums">
                  {formatCentsPlain(totals.subtotalCents)} {currency}
                </dd>
              </div>
              {totals.vatBreakdown.map((row) => (
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
                  {formatCentsPlain(totals.totalCents)} {currency}
                </dd>
              </div>
            </dl>
          </div>

          <Field data-invalid={Boolean(errors.comments)}>
            <FieldLabel htmlFor="comments">Comments</FieldLabel>
            <Textarea
              id="comments"
              rows={3}
              aria-invalid={Boolean(errors.comments)}
              {...form.register("comments")}
            />
            <FieldDescription>
              Printed at the bottom of the invoice.
            </FieldDescription>
            <FieldError errors={[errors.comments]} />
          </Field>

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {invoice ? "Save invoice" : "Create invoice"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() =>
                invoice ? goToInvoice(invoice.id) : router.push("/invoices")
              }
            >
              Cancel
            </Button>
            {invoice && (
              <span className="text-sm text-muted-foreground">
                {invoice.invoiceNumber}
              </span>
            )}
          </Field>
        </FieldGroup>
      </form>

      {/* Nothing is resent without this confirmation; declining leaves the
          "Edited after sending" badge in place (docs/PRD.md §12.1). */}
      <AlertDialog
        open={resendFor !== null}
        onOpenChange={(open) => {
          if (!open && !isResending) {
            const target = resendFor;
            setResendFor(null);

            if (target) {
              goToInvoice(target);
            }
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Resend this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedClient?.email
                ? `You already emailed this invoice. Resend the updated version to ${selectedClient.email}? Until you do, it stays marked as edited after sending.`
                : "You already emailed this invoice, but this client has no email address, so it cannot be resent. It stays marked as edited after sending."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResending}>Not now</AlertDialogCancel>
            <AlertDialogAction
              disabled={isResending || !selectedClient?.email}
              onClick={onResend}
            >
              {isResending && <Spinner />}
              Resend now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
