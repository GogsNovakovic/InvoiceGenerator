"use client";

import { useState } from "react";
import { toast } from "sonner";

import { setInvoiceStatusAction } from "@/lib/actions/invoices";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * The manual paid / not paid toggle. It is free in both directions and asks no
 * questions, even on an invoice Stripe confirmed — the permanent lock is on
 * editing and deleting, not on the status (docs/PRD.md §10).
 */
export function InvoiceStatusControl({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: "not_paid" | "paid";
}) {
  const [isPending, setIsPending] = useState(false);

  async function onToggle(checked: boolean) {
    setIsPending(true);
    const result = await setInvoiceStatusAction(
      invoiceId,
      checked ? "paid" : "not_paid",
    );
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(checked ? "Marked as paid." : "Marked as not paid.");
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="invoice-status"
        checked={status === "paid"}
        disabled={isPending}
        onCheckedChange={onToggle}
      />
      <Label htmlFor="invoice-status">Paid</Label>
    </div>
  );
}
