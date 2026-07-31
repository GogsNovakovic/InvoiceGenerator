import "server-only";

import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

export const PAGE_SIZE = 20;

export type ClientListItem = Pick<
  ClientRow,
  "id" | "full_name" | "company_name" | "email"
>;

export type ClientRecord = Pick<
  ClientRow,
  "id" | "full_name" | "company_name" | "email" | "address" | "vat_id"
>;

export type ClientOption = {
  id: string;
  label: string;
  email: string | null;
};

export type ClientListResult = {
  clients: ClientListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  pageCount: number;
};

export function clientLabel(client: {
  full_name: string | null;
  company_name: string | null;
}) {
  return client.full_name ?? client.company_name ?? "Unnamed client";
}

/**
 * `.or()` takes a raw PostgREST filter string in which commas and parentheses
 * are syntax, so an unquoted pattern from a name like "Acme, Inc" would be
 * parsed as extra conditions. Escaping the LIKE wildcards and wrapping the
 * whole pattern in double quotes keeps it a single literal.
 */
function searchFilter(query: string) {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
  const pattern = `"%${escaped.replace(/"/g, '\\"')}%"`;

  return [
    `full_name.ilike.${pattern}`,
    `company_name.ilike.${pattern}`,
    `email.ilike.${pattern}`,
  ].join(",");
}

/**
 * `user_id` is filtered explicitly even though RLS already scopes the table.
 * RLS is the boundary; this is the second line of defence (docs/Tech.md §12).
 * Always called with the id from `requireUser()`, never one sent by the client.
 */
export async function listClients(
  userId: string,
  options: { query?: string; page?: number } = {},
): Promise<ClientListResult> {
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;
  const supabase = createClient(await cookies());

  let request = supabase
    .from("clients")
    .select("id, full_name, company_name, email", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const query = options.query?.trim();

  if (query) {
    request = request.or(searchFilter(query));
  }

  const { data, error, count } = await request;

  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;

  return {
    clients: data ?? [],
    page,
    pageSize: PAGE_SIZE,
    totalCount,
    pageCount: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  };
}

export async function getClientById(
  userId: string,
  clientId: string,
): Promise<ClientRecord | null> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, company_name, email, address, vat_id")
    .eq("user_id", userId)
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/** Backs the client picker, which needs a label rather than raw columns. */
export async function searchClientOptions(
  userId: string,
  query: string,
  limit = PAGE_SIZE,
): Promise<ClientOption[]> {
  const supabase = createClient(await cookies());

  let request = supabase
    .from("clients")
    .select("id, full_name, company_name, email")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const trimmed = query.trim();

  if (trimmed) {
    request = request.or(searchFilter(trimmed));
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: clientLabel(row),
    email: row.email,
  }));
}
