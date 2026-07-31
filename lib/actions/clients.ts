"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import {
  clientLabel,
  getClientById,
  searchClientOptions,
  type ClientOption,
} from "@/lib/data/clients";
import { clientIdSchema, clientSchema } from "@/lib/validation/client";
import { createClient } from "@/utils/supabase/server";

/**
 * Every action is a public POST endpoint (docs/Tech.md §4.5), so each one
 * re-authenticates, re-validates with Zod and re-reads ownership itself.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

export type CreateClientResult =
  | { ok: true; client: ClientOption }
  | { ok: false; message: string };

function invalid(message: string) {
  return { ok: false as const, message };
}

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function createClientAction(
  input: unknown,
): Promise<CreateClientResult> {
  const parsed = clientSchema.safeParse(input);

  if (!parsed.success) {
    return invalid(firstIssue(parsed.error));
  }

  const user = await requireUser();
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("clients")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id, full_name, company_name, email")
    .single();

  if (error || !data) {
    return invalid("Could not create the client. Try again.");
  }

  refresh();

  // Returned so the inline picker can select the new client without a re-fetch.
  return {
    ok: true,
    client: { id: data.id, label: clientLabel(data), email: data.email },
  };
}

export async function updateClientAction(
  clientId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsedId = clientIdSchema.safeParse(clientId);

  if (!parsedId.success) {
    return invalid("Invalid client.");
  }

  const parsed = clientSchema.safeParse(input);

  if (!parsed.success) {
    return invalid(firstIssue(parsed.error));
  }

  const user = await requireUser();
  const existing = await getClientById(user.id, parsedId.data);

  if (!existing) {
    return invalid("This client no longer exists.");
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    return invalid("Could not save the client. Try again.");
  }

  refresh();

  return { ok: true };
}

/**
 * Hard delete. Invoices keep their own snapshot of the client and their
 * `client_id` drops to null via the foreign key (docs/DB.md §4.4), so nothing
 * here needs to touch them.
 */
export async function deleteClientAction(
  clientId: string,
): Promise<ActionResult> {
  const parsedId = clientIdSchema.safeParse(clientId);

  if (!parsedId.success) {
    return invalid("Invalid client.");
  }

  const user = await requireUser();
  const existing = await getClientById(user.id, parsedId.data);

  if (!existing) {
    return invalid("This client no longer exists.");
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    return invalid("Could not delete the client. Try again.");
  }

  refresh();

  return { ok: true };
}

/** A read, but the picker calls it imperatively, so it lives with the actions. */
export async function searchClients(query: string): Promise<ClientOption[]> {
  const user = await requireUser();

  return searchClientOptions(user.id, query);
}
