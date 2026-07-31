import * as z from "zod";

/**
 * Shared between the client (react-hook-form feedback) and the server (the real
 * gate inside every client action). See docs/Tech.md §4.5.
 */

/**
 * Blank optional fields resolve to `null`, never `undefined`: supabase-js omits
 * undefined keys from an update, so clearing a field in the edit form would
 * silently keep the previous value instead of erasing it.
 */
function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: `${label} must be ${max} characters or fewer.` })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));
}

const email = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed.toLowerCase() : null;
  })
  .pipe(z.email({ error: "Enter a valid email address." }).nullable());

/**
 * Mirrors the `clients_display_name_present` check constraint (docs/DB.md §4.3)
 * so a missing name surfaces as a field error rather than a raw Postgres
 * violation.
 */
export const clientSchema = z
  .object({
    full_name: optionalText("Full name", 200),
    company_name: optionalText("Company name", 200),
    email,
    address: optionalText("Address", 500),
    vat_id: optionalText("VAT ID", 50),
  })
  .refine((data) => Boolean(data.full_name) || Boolean(data.company_name), {
    error: "Enter a full name or a company name.",
    path: ["full_name"],
  });

export const clientIdSchema = z.uuid({ error: "Invalid client." });

/** What the form collects — every field is a string, blanks included. */
export type ClientFormValues = z.input<typeof clientSchema>;

/** What the action writes — blanks already normalised to null. */
export type ClientInput = z.output<typeof clientSchema>;
