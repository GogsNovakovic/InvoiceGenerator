"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiMailCheckLine } from "@remixicon/react";

import { resendConfirmation, signUp } from "@/lib/actions/auth";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    setFormError(null);

    const result = await signUp(values);

    if (result.ok) {
      setSubmittedEmail(values.email);
      return;
    }

    setFormError(result.message);
  }

  async function onResend() {
    if (!submittedEmail) return;

    setResendState("sending");
    await resendConfirmation({ email: submittedEmail });
    setResendState("sent");
  }

  if (submittedEmail) {
    return (
      <Empty className="border-0 p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiMailCheckLine />
          </EmptyMedia>
          <EmptyTitle>Check your inbox</EmptyTitle>
          <EmptyDescription>
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">
              {submittedEmail}
            </span>
            . Open it to activate your account, then sign in.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            disabled={resendState !== "idle"}
            onClick={onResend}
          >
            {resendState === "sending" && <Spinner />}
            {resendState === "sent" ? "Email sent" : "Resend the email"}
          </Button>
          <FieldDescription className="text-center">
            Nothing arrived? Check your spam folder before resending.
          </FieldDescription>
        </EmptyContent>
      </Empty>
    );
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
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          <FieldDescription>
            At least 8 characters, including a letter and a number.
          </FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>

        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Create account
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
