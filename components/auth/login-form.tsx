"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { resendConfirmation, signIn } from "@/lib/actions/auth";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
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

export function LoginForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    setFormError(null);
    setUnconfirmed(false);
    setResendState("idle");

    // A successful sign-in redirects from the server and never returns here.
    const result = await signIn(values);

    if (result && !result.ok) {
      setFormError(result.message);
      setUnconfirmed(result.code === "email_not_confirmed");
    }
  }

  async function onResend() {
    setResendState("sending");
    await resendConfirmation({ email: form.getValues("email") });
    setResendState("sent");
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>
              <p>{formError}</p>
              {unconfirmed && (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className="h-auto p-0"
                  disabled={resendState !== "idle"}
                  onClick={onResend}
                >
                  {resendState === "sent"
                    ? "Confirmation email sent."
                    : "Send the confirmation email again"}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={Boolean(errors.password)}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Sign in
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
