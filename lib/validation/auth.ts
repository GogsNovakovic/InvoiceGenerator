import * as z from "zod";

/**
 * Shared between the client (react-hook-form feedback) and the server
 * (the real gate inside every auth action). See docs/Tech.md §4.5.
 */

const email = z
  .string()
  .trim()
  .min(1, { error: "Enter your email address." })
  .pipe(z.email({ error: "Enter a valid email address." }))
  .transform((value) => value.toLowerCase());

/**
 * The password rules, as data rather than as chained zod checks, so the schema
 * below and the live checklist the user sees while typing
 * (components/auth/password-requirements.tsx) are built from one list and
 * cannot drift apart.
 *
 * The Supabase project's own minimum must be raised to 8 as well, otherwise the
 * database accepts weaker passwords set through any other path.
 */
export const passwordRules = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
    error: "Use at least 8 characters.",
  },
  {
    id: "letter",
    label: "A letter (a–z)",
    test: (value: string) => /[a-zA-Z]/.test(value),
    error: "Include at least one letter.",
  },
  {
    id: "number",
    label: "A number (0–9)",
    test: (value: string) => /[0-9]/.test(value),
    error: "Include at least one number.",
  },
  {
    // Anything non-alphanumeric, deliberately: an allowlist such as [!@#$%^&*]
    // would reject "£" and every other non-ASCII symbol. A space counts too.
    id: "special",
    label: "A special character (! ? @ £ #)",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
    error: "Include at least one special character.",
  },
] as const;

/**
 * `.refine()` chains stop at the first failure, so only one message ever
 * reaches the server action — which reads `issues[0]` anyway. The checklist is
 * what shows all four states at once.
 */
// Both generics are pinned: z.ZodType defaults its Input to `unknown`, which
// would make every field holding this schema infer `password: unknown`.
const password = passwordRules.reduce<z.ZodType<string, string>>(
  (schema, rule) => schema.refine(rule.test, { error: rule.error }),
  z.string().max(72, { error: "Use at most 72 characters." }),
);

export const signInSchema = z.object({
  email,
  // Never re-validate the password rules on sign-in: an account created before
  // a rule change must still be able to sign in and then change it.
  password: z.string().min(1, { error: "Enter your password." }),
});

export const signUpSchema = z.object({
  email,
  password,
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, { error: "Confirm your new password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const resendConfirmationSchema = z.object({
  email,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
