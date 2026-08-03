"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { updateProfileAction } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/currency";
import type { ProfileRecord } from "@/lib/data/profile";
import {
  profileSchema,
  type ProfileFormValues,
  type ProfileInput,
} from "@/lib/validation/profile";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

/**
 * The From block on every invoice. Every identity field is optional by product
 * decision (docs/PRD.md §5) — only the default currency is required, and it
 * already has one.
 */
export function ProfileForm({ profile }: { profile: ProfileRecord }) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      company_name: profile.company_name ?? "",
      email: profile.email ?? "",
      address: profile.address ?? "",
      vat_id: profile.vat_id ?? "",
      website: profile.website ?? "",
      default_currency: profile.default_currency,
    },
  });

  async function onSubmit(values: ProfileInput) {
    setFormError(null);

    const result = await updateProfileAction(values);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    toast.success("Details saved.");
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
            autoComplete="name"
            aria-invalid={Boolean(errors.full_name)}
            {...form.register("full_name")}
          />
          <FieldError errors={[errors.full_name]} />
        </Field>

        <Field data-invalid={Boolean(errors.company_name)}>
          <FieldLabel htmlFor="company_name">Company name</FieldLabel>
          <Input
            id="company_name"
            autoComplete="organization"
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
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldDescription>
            Printed on your invoices, and where your clients&rsquo; replies to a
            sent invoice are delivered.
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

        <Field data-invalid={Boolean(errors.website)}>
          <FieldLabel htmlFor="website">Website</FieldLabel>
          <Input
            id="website"
            autoComplete="url"
            aria-invalid={Boolean(errors.website)}
            {...form.register("website")}
          />
          <FieldError errors={[errors.website]} />
        </Field>

        <Field data-invalid={Boolean(errors.default_currency)}>
          <FieldLabel htmlFor="default_currency">Default currency</FieldLabel>
          <NativeSelect
            id="default_currency"
            className="w-full"
            aria-invalid={Boolean(errors.default_currency)}
            {...form.register("default_currency")}
          >
            {CURRENCIES.map((currency) => (
              <NativeSelectOption key={currency} value={currency}>
                {currency}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>
            Preselected on every new invoice. You can still change it per
            invoice.
          </FieldDescription>
          <FieldError errors={[errors.default_currency]} />
        </Field>

        <Field orientation="horizontal">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Save details
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
