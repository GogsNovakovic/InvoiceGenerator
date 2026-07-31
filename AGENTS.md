<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project documentation

Read these **before** planning or writing code, not after. Each one is the authority in its own area — when code and doc disagree, raise it rather than silently picking one.

| Document | Answers | Read it when |
|---|---|---|
| [docs/PRD.md](docs/PRD.md) | **What** the product does — features, business rules, what is deliberately out of scope, acceptance criteria | Any question about behaviour, edge cases, or whether something belongs in v1 |
| [docs/Tech.md](docs/Tech.md) | **How** it is built — stack versions, Next.js 16 conventions, app structure, Stripe / PDF / email flows, build order | Before adding a file, choosing a package, or wiring a new flow |
| [docs/DB.md](docs/DB.md) | **What the database guarantees** — tables, RLS policies, triggers, functions, migrations, storage layout | Any query, migration, or assumption about ownership, totals, or locking |

Key rules those documents encode, so they are not accidentally re-litigated:

- Money is **integer cents**; VAT rates are **integer basis points**. No float ever touches an amount.
- The **database owns the arithmetic** — line totals are generated columns, invoice totals are set by trigger. Application code never writes a total.
- **RLS is the security boundary.** Application checks are the second line of defence, never the first.
- Sender and client details are **snapshotted onto the invoice**. An issued invoice is immutable history.
- `proxy.ts` (not `middleware.ts`) is optimistic redirect only — every Server Action re-authenticates and re-reads ownership itself.

# Supabase: use the MCP connection, do not hand work back

This project has a live **MCP connection to Supabase** (project `rrffjgmvwreldgrwlykp`). Use it.

- When asked to do anything to Supabase — migrations, schema changes, queries, RLS policies, type generation, advisors, log inspection — **execute it yourself through the MCP tools**.
- Do **not** print SQL for the user to paste into the dashboard, and do not end a task with a list of steps for them to finish. Doing the work is the deliverable.
- The **only** acceptable exception is something the MCP connection genuinely cannot reach (for example Auth dashboard settings or SMTP configuration). In that case say plainly which specific part is blocked and why — then complete everything else.

Schema changes land as **migrations** in the numbered sequence described in [docs/DB.md](docs/DB.md) §8, never as ad-hoc `execute_sql` DDL. After changing the schema, regenerate the TypeScript types and update [docs/DB.md](docs/DB.md) so the document still matches the live database.

# UI

All UI components come from **shadcn/ui via the shadcn MCP server**, using the existing preset in [components.json](components.json). Components are added through the MCP server — never hand-written and never copied in from memory.
