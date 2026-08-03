"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiDeleteBinLine } from "@remixicon/react";
import { toast } from "sonner";

import { deleteInvoiceAction } from "@/lib/actions/invoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Deleting is permanent: the invoice, its PDF and its place in the numbering
 * sequence all go, and the number is never reused (docs/PRD.md §13).
 *
 * Paid invoices cannot be deleted, and a Stripe-confirmed one never can. Both
 * rules are database triggers; this only explains them up front.
 */
export function DeleteInvoiceDialog({
  invoiceId,
  invoiceNumber,
  canDelete,
  stripeConfirmed,
  /** Rendered as an icon button in the list, a labelled one on the detail screen. */
  variant = "labelled",
  redirectTo,
}: {
  invoiceId: string;
  invoiceNumber: string;
  canDelete: boolean;
  stripeConfirmed: boolean;
  variant?: "labelled" | "icon";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function onConfirm() {
    setIsDeleting(true);
    const result = await deleteInvoiceAction(invoiceId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setOpen(false);
    toast.success(`${invoiceNumber} deleted.`);

    if (redirectTo) {
      router.push(redirectTo);
    }
  }

  const trigger =
    variant === "icon" ? (
      <Button variant="ghost" size="icon-sm" aria-label="Delete invoice">
        <RiDeleteBinLine />
      </Button>
    ) : (
      <Button variant="outline">
        <RiDeleteBinLine data-icon="inline-start" />
        Delete
      </Button>
    );

  if (!canDelete) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} />}>
          {variant === "icon" ? (
            <Button variant="ghost" size="icon-sm" aria-label="Delete invoice" disabled>
              <RiDeleteBinLine />
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <RiDeleteBinLine data-icon="inline-start" />
              Delete
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {stripeConfirmed
            ? "This invoice was paid through Stripe and cannot be deleted."
            : "Mark this invoice as not paid before deleting it."}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {invoiceNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the invoice and its PDF for good. The number is retired
            and leaves a gap in your sequence — it is never reused.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting && <Spinner />}
            Delete invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
