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
 * Minimum 8 characters with at least one letter and one digit. The Supabase
 * project's own minimum must be raised to 8 as well, otherwise the database
 * accepts weaker passwords set through any other path.
 */
const password = z
  .string()
  .min(8, { error: "Use at least 8 characters." })
  .max(72, { error: "Use at most 72 characters." })
  .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
  .regex(/[0-9]/, { error: "Include at least one number." });

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
