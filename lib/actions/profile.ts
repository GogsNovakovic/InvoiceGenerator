"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validation/profile";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * The sender details behind the From block. Editing them never touches an
 * existing invoice — those carry their own snapshot (docs/PRD.md §7.1).
 */
export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  const user = await requireUser();
  const supabase = createClient(await cookies());

  // Scoped by id as well as trusting the RLS policy, per docs/Tech.md §12.
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Could not save your details. Try again." };
  }

  refresh();

  return { ok: true };
}
