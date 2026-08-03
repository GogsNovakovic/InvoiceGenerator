import * as z from "zod";

import { CURRENCIES } from "@/lib/currency";

/**
 * The sender details that get snapshotted onto every new invoice
 * (docs/PRD.md §5). Every identity field is optional by design; only the
 * default currency is required, and it has a default.
 */

/** Blanks become `null` so clearing a field in the form actually clears it. */
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
 * A bare "acme.com" is what people type, so it is accepted and normalised
 * rather than rejected — the value ends up in the PDF, not in an href.
 */
const website = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  })
  .pipe(
    z
      .string()
      .max(200, { error: "Website must be 200 characters or fewer." })
      .nullable(),
  );

export const profileSchema = z.object({
  full_name: optionalText("Full name", 200),
  company_name: optionalText("Company name", 200),
  email,
  address: optionalText("Address", 500),
  vat_id: optionalText("VAT ID", 50),
  website,
  default_currency: z.enum(CURRENCIES, { error: "Choose a currency." }),
});

export type ProfileFormValues = z.input<typeof profileSchema>;
export type ProfileInput = z.output<typeof profileSchema>;
