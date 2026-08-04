"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updatePassword } from "@/lib/actions/auth";
import {
  passwordRules,
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validation/auth";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ResetPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);

    // Redirects to the dashboard on success and never returns here.
    const result = await updatePassword(values);

    if (result && !result.ok) {
      setFormError(result.message);
    }
  }

  // Drives the live checklist.
  const passwordValue = useWatch({ control: form.control, name: "password" });

  const { errors, isSubmitted, isSubmitting } = form.formState;

  // See register-form.tsx — the checklist already states every rule it covers.
  const passwordErrorIsCovered = passwordRules.some(
    (rule) => rule.error === errors.password?.message,
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-requirements"
            {...form.register("password")}
          />
          <PasswordRequirements
            id="password-requirements"
            value={passwordValue ?? ""}
            showErrors={isSubmitted}
          />
          {errors.password && !passwordErrorIsCovered && (
            <FieldError errors={[errors.password]} />
          )}
        </Field>

        <Field data-invalid={Boolean(errors.confirmPassword)}>
          <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...form.register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>

        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Set new password
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
