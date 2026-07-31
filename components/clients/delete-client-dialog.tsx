"use client";

import { useState } from "react";
import { RiDeleteBinLine } from "@remixicon/react";
import { toast } from "sonner";

import { deleteClientAction } from "@/lib/actions/clients";
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

export function DeleteClientDialog({
  clientId,
  clientLabel,
}: {
  clientId: string;
  clientLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function onConfirm() {
    setIsDeleting(true);
    const result = await deleteClientAction(clientId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setOpen(false);
    toast.success("Client deleted.");
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Delete client" />
        }
      >
        <RiDeleteBinLine />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this client?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting {clientLabel} is permanent. Existing invoices keep their own
            copy of these details and are not affected.
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
            Delete client
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
