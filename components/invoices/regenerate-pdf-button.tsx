"use client";

import { useState } from "react";
import { RiRefreshLine } from "@remixicon/react";
import { toast } from "sonner";

import { regenerateInvoicePdfAction } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The retry for a PDF that failed to render or upload. Saving an invoice never
 * fails because of its PDF — the invoice is kept and this button is offered
 * instead, so a transient Storage error cannot cost an invoice number.
 */
export function RegeneratePdfButton({
  invoiceId,
  variant = "outline",
}: {
  invoiceId: string;
  variant?: "outline" | "default";
}) {
  const [isPending, setIsPending] = useState(false);

  async function onClick() {
    setIsPending(true);
    const result = await regenerateInvoicePdfAction(invoiceId);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("PDF regenerated.");
  }

  return (
    <Button variant={variant} disabled={isPending} onClick={onClick}>
      {isPending ? <Spinner /> : <RiRefreshLine data-icon="inline-start" />}
      Regenerate PDF
    </Button>
  );
}
