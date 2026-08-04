"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import type { ClientOption, ClientRecord } from "@/lib/data/clients";
import { clientSchema, type ClientFormValues } from "@/lib/validation/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type ClientFormProps = {
  /** Provided when editing; its presence switches the form to update mode. */
  client?: ClientRecord;
  /** Set by the inline picker: suppresses navigation and hands back the row. */
  onSuccess?: (client: ClientOption) => void;
  onCancel?: () => void;
};

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  // `raw: true` keeps the fields as the inputs collect them. The resolver would
  // otherwise hand `handleSubmit` the schema's *output*, where a blank field has
  // already become `null` — and the action, which validates the same schema
  // again, rejects `null` where it expects an optional string.
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema, undefined, { raw: true }),
    defaultValues: {
      full_name: client?.full_name ?? "",
      company_name: client?.company_name ?? "",
      email: client?.email ?? "",
      address: client?.address ?? "",
      vat_id: client?.vat_id ?? "",
    },
  });

  async function onSubmit(values: ClientFormValues) {
    setFormError(null);

    if (client) {
      const result = await updateClientAction(client.id, values);

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      toast.success("Client saved.");
      router.push("/clients");
      return;
    }

    const result = await createClientAction(values);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    toast.success("Client created.");

    if (onSuccess) {
      onSuccess(result.client);
      return;
    }

    router.push("/clients");
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(errors.full_name)}>
          <FieldLabel htmlFor="full_name">Full name</FieldLabel>
          <Input
            id="full_name"
            autoComplete="off"
            autoFocus
            aria-invalid={Boolean(errors.full_name)}
            {...form.register("full_name")}
          />
          <FieldDescription>
            Enter a full name, a company name, or both.
          </FieldDescription>
          <FieldError errors={[errors.full_name]} />
        </Field>

        <Field data-invalid={Boolean(errors.company_name)}>
          <FieldLabel htmlFor="company_name">Company name</FieldLabel>
          <Input
            id="company_name"
            autoComplete="off"
            aria-invalid={Boolean(errors.company_name)}
            {...form.register("company_name")}
          />
          <FieldError errors={[errors.company_name]} />
        </Field>

        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldDescription>
            Without an email address you can still create invoices for this
            client, but you cannot send them.
          </FieldDescription>
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={Boolean(errors.address)}>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Textarea
            id="address"
            rows={3}
            aria-invalid={Boolean(errors.address)}
            {...form.register("address")}
          />
          <FieldError errors={[errors.address]} />
        </Field>

        <Field data-invalid={Boolean(errors.vat_id)}>
          <FieldLabel htmlFor="vat_id">VAT ID</FieldLabel>
          <Input
            id="vat_id"
            autoComplete="off"
            aria-invalid={Boolean(errors.vat_id)}
            {...form.register("vat_id")}
          />
          <FieldError errors={[errors.vat_id]} />
        </Field>

        <Field orientation="horizontal">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {client ? "Save changes" : "Create client"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => (onCancel ? onCancel() : router.push("/clients"))}
          >
            Cancel
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
