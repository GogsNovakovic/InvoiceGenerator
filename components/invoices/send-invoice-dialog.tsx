"use client";

import { useState } from "react";
import { RiMailSendLine } from "@remixicon/react";
import { toast } from "sonner";

import { sendInvoiceAction } from "@/lib/actions/send";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Send / Resend, behind a confirmation that shows the recipient and takes an
 * optional note. The PDF is attached and Reply-To is the freelancer's own
 * address (docs/PRD.md §12).
 *
 * Two reasons the button is disabled, each with the tooltip that explains it:
 * a client with no email address, and an invoice whose PDF has not been
 * generated yet.
 */
export function SendInvoiceDialog({
  invoiceId,
  clientEmail,
  hasPdf,
  alreadySent,
}: {
  invoiceId: string;
  clientEmail: string | null;
  hasPdf: boolean;
  alreadySent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);

  const blockedReason = !clientEmail
    ? "This client has no email address."
    : !hasPdf
      ? "This invoice has no PDF yet. Regenerate it first."
      : null;

  async function onSend() {
    setIsSending(true);
    const result = await sendInvoiceAction(invoiceId, note);
    setIsSending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setOpen(false);
    setNote("");
    toast.success(`Invoice sent to ${clientEmail}.`);
  }

  const label = alreadySent ? "Resend" : "Send";

  if (blockedReason) {
    return (
      <Tooltip>
        {/* A disabled button fires no pointer events, so the trigger is the
            wrapper rather than the button itself. */}
        <TooltipTrigger render={<span tabIndex={0} />}>
          <Button disabled>
            <RiMailSendLine data-icon="inline-start" />
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{blockedReason}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <RiMailSendLine data-icon="inline-start" />
        {label}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {alreadySent ? "Resend this invoice?" : "Send this invoice?"}
          </DialogTitle>
          <DialogDescription>
            The invoice PDF goes to <strong>{clientEmail}</strong> as an
            attachment. Replies come back to your profile email address.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="send-note">Note (optional)</FieldLabel>
          <Textarea
            id="send-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything you want to say alongside the invoice."
          />
          <FieldDescription>
            Added to the email body above the invoice summary.
          </FieldDescription>
        </Field>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={isSending} />}
          >
            Cancel
          </DialogClose>
          <Button disabled={isSending} onClick={onSend}>
            {isSending && <Spinner />}
            {label} invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
