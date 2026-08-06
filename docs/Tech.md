# Invoice Generator — Architecture & Technical Implementation

**Last updated:** 2026-07-30
**Companion documents:** [PRD.md](PRD.md) (product), [DB.md](DB.md) (data model)

---

## 1. Stack summary

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.12, App Router, Turbopack, TypeScript strict |
| UI runtime | React 19.2.4 |
| Styling | Tailwind CSS v4 (CSS-first config) |
| Components | shadcn/ui, `base-luma` style, built on Base UI primitives |
| Icons | Remix Icon (`@remixicon/react`) |
| Database / Auth / File storage | Supabase (Postgres, Supabase Auth, Storage) |
| Payments | Stripe Connect (Express accounts, direct charges, Payment Links) |
| Transactional email | Resend |
| PDF | `@react-pdf/renderer`, rendered server-side |
| Validation | Zod, shared between client and server |
| Hosting | Vercel |

---

## 2. What is already installed

Verified against `package.json`, `components.json`, and the working tree.

**Runtime dependencies present:**

```
next 16.2.12            react 19.2.4            react-dom 19.2.4
@supabase/ssr 0.12.3    @supabase/supabase-js 2.110.8
resend 6.18.1           stripe 22.4.0
@base-ui/react 1.6.0    @remixicon/react 4.9.0
class-variance-authority 0.7.1   clsx 2.1.1   tailwind-merge 3.6.0   tw-animate-css 1.4.0
```

**Dev dependencies present:** `tailwindcss ^4`, `@tailwindcss/postcss`, `shadcn 4.16.0`, `typescript ^5`, `eslint ^9`, `eslint-config-next 16.2.12`, `@types/*`.

**Code already in place:**

| File | State |
|---|---|
| [utils/supabase/server.ts](../utils/supabase/server.ts) | Server client via `createServerClient`, takes an awaited cookie store. Reusable as-is. |
| [utils/supabase/client.ts](../utils/supabase/client.ts) | Browser client. Reusable as-is. |
| [utils/supabase/proxy.ts](../utils/supabase/proxy.ts) | `updateSession` — session refresh with correct cookie plumbing. Reusable as-is. |
| [proxy.ts](../proxy.ts) | Root proxy wired to `updateSession`, with a static-asset matcher. Needs route protection added. |
| [utils/resend/client.ts](../utils/resend/client.ts) | Lazy Resend singleton, `RESEND_FROM`. Reusable as-is. |
| [utils/resend/send-invoice.ts](../utils/resend/send-invoice.ts) | HTML + plain-text invoice email with HTML escaping. Good bones — needs rewriting to English, plus a PDF attachment, the payment link, and `replyTo`. |
| [app/layout.tsx](../app/layout.tsx) | Fonts (Geist, Noto Sans, EB Garamond) and shell. Metadata still says "Create Next App". |
| [app/globals.css](../app/globals.css) | Tailwind v4 + `shadcn/tailwind.css` + theme tokens. Reusable as-is. |
| [components/ui/button.tsx](../components/ui/button.tsx) | The only shadcn component installed so far. |
| [lib/utils.ts](../lib/utils.ts) | `cn()` helper. |

**Being removed:**

- [app/todos/page.tsx](../app/todos/page.tsx) — scaffolding that queries a `todos` table which does not exist.
- [app/api/invoices/send/route.ts](../app/api/invoices/send/route.ts) — an unauthenticated send endpoint; replaced by a Server Action with a real auth check.

**Database state:** the Supabase project (`rrffjgmvwreldgrwlykp`) currently has **zero tables and zero migrations**. Everything in [DB.md](DB.md) is new work and is the first thing to build.

---

## 3. Packages added during the build

All installed:

| Package | Why |
|---|---|
| `stripe` (22.4.0) | Server-side Stripe SDK — Connect accounts, Payment Links, webhook signature verification |
| `@react-pdf/renderer` | Server-side PDF generation, no headless browser required |
| `zod` | One schema per form, reused for client feedback and as the server-side gate |
| `react-hook-form` + `@hookform/resolvers` | Required by the shadcn `form` component; drives the dynamic line-item editor |

**shadcn components to add** (all via the shadcn MCP server, using the existing `base-luma` / `mist` preset in [components.json](../components.json) — never hand-written):

```
input label field form textarea select native-select combobox
table badge card dialog alert-dialog dropdown-menu tooltip popover calendar
pagination separator skeleton spinner empty sonner tabs switch sidebar
```

`combobox` for the searchable client picker, `alert-dialog` for the resend and delete confirmations, `sonner` for toasts, `empty` for empty list states.

---

## 4. Next.js 16 conventions that govern this build

This is **not** the Next.js in most training data. The following are hard rules for this repo, taken from `node_modules/next/dist/docs`.

### 4.1 `proxy.ts`, not `middleware.ts`

Middleware was renamed to **Proxy** in Next.js 16. The file is `proxy.ts` at the project root, exporting a function named `proxy`. It already exists and is correct.

- The proxy runtime is **Node.js only** and cannot be configured. There is no Edge option.
- `fetch` cache options (`cache`, `next.revalidate`, `next.tags`) have no effect inside proxy.
- Proxy is for optimistic redirects only — **not** a security boundary. It refreshes the Supabase session cookie and bounces unauthenticated users away from app routes, but every Server Action and every data read performs its own auth check.
- Config flags renamed accordingly (`skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`).

### 4.2 Async request APIs are mandatory

Synchronous access was removed in 16. `cookies()`, `headers()`, `draftMode()`, and `params` / `searchParams` in pages, layouts, and route handlers are all Promises and must be awaited.

```ts
// app/(app)/invoices/[id]/page.tsx
export default async function Page(props: PageProps<'/invoices/[id]'>) {
  const { id } = await props.params
  const supabase = createClient(await cookies())
  // ...
}
```

Run `npx next typegen` to get the globally available `PageProps`, `LayoutProps`, and `RouteContext` type helpers, and use them instead of hand-written prop types.

### 4.3 Turbopack is the default

`next dev` and `next build` both use Turbopack with no flag. The scripts in [package.json](../package.json) are already correct — do not re-add `--turbopack`. No webpack config will be introduced, since its presence would fail the build. Turbopack options, if ever needed, go at the **top level** of `next.config.ts` as `turbopack`, not under `experimental`.

### 4.4 Caching: dynamic by default, and that is what we want

`cacheComponents` stays **off**. Every screen in this app renders per-user, request-scoped, authenticated data — there is nothing safe to prerender or share between users.

- Do **not** apply `use cache` to any function that reads invoices, clients, or profiles. That directive stores results on the server, which would be a cross-user data leak.
- If a per-user cache is ever needed, the correct tool is `'use cache: private'`, which never stores on the server. Not needed for v1.
- `revalidateTag` now **requires** a second `cacheLife` argument; the one-argument form is a TypeScript error.
- In Server Actions, prefer **`updateTag`** (read-your-own-writes, expires and refreshes in the same request) or **`refresh`** (re-fetch the current route's payload). Both ship a re-rendered route in the action's own response, so a mutation and its updated UI complete in a single roundtrip. `revalidateTag` with a stale-while-revalidate profile deliberately skips that re-render and is the wrong choice for "save and see it".

### 4.5 Server Actions are public endpoints

A Server Action is a POST route reachable by anyone who can send the request; rendering a form on an authenticated page is *not* a security boundary. Next.js provides an Origin/Host CSRF check, a 1 MB body limit, encrypted action IDs, and closure encryption — none of which substitute for application checks.

Every action in this codebase follows the same shape:

```ts
'use server'

export async function updateInvoice(invoiceId: string, input: unknown) {
  const user = await requireUser()                    // 1. authenticate
  const parsed = invoiceSchema.parse(input)           // 2. validate shape
  const invoice = await getOwnedInvoice(invoiceId, user.id)  // 3. re-read by ownership
  assertEditable(invoice)                             // 4. authorize the operation
  // 5. mutate, then updateTag / refresh
}
```

Rule: the client sends an **ID plus the change**, never a whole record. Ownership and current state are always re-read server-side. Zod checks shape, not entitlement — a well-formed invoice object can still name someone else's row.

For self-hosted or multi-instance deployments, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` must be a stable shared value. On Vercel this is handled automatically.

---

## 5. Application structure

```
app/
  layout.tsx                      root shell, fonts, <Toaster />
  page.tsx                        redirect: → /login or → /dashboard
  (auth)/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    auth/confirm/route.ts         Supabase email-confirm / recovery token exchange
  (app)/
    layout.tsx                    authenticated shell: sidebar, user menu, requireUser()
    dashboard/page.tsx
    invoices/page.tsx             list: search, status filter, sort, pagination
    invoices/new/page.tsx
    invoices/[id]/page.tsx        detail / preview
    invoices/[id]/edit/page.tsx
    clients/page.tsx
    clients/new/page.tsx
    clients/[id]/edit/page.tsx
    settings/profile/page.tsx
    settings/payments/page.tsx    Stripe connection state + onboarding
  api/
    stripe/webhook/route.ts       Connect webhook, raw body, signature verified
    stripe/connect/return/route.ts  Stripe onboarding return/refresh landing
    invoices/[id]/pdf/route.ts    authenticated PDF download

lib/
  auth.ts                         requireUser(), getUser()
  money.ts                        integer-cent arithmetic and formatting
  invoice-totals.ts               line → subtotal / tax / total / VAT breakdown
  currency.ts                     the supported currency list and metadata
  validation/
    invoice.ts  client.ts  profile.ts  auth.ts     Zod schemas
  data/                           Data Access Layer — server-only reads
    invoices.ts  clients.ts  profile.ts  dashboard.ts
  actions/                        Server Actions — all mutations
    invoices.ts  clients.ts  profile.ts  stripe.ts  send.ts
  pdf/
    invoice-document.tsx          the react-pdf document
    fonts.ts                      font registration
    render.ts                     renderToBuffer wrapper
  stripe/
    client.ts                     Stripe SDK singleton
    connect.ts                    account creation, account links, status sync
    payment-links.ts              product + price + payment link creation
  supabase/
    admin.ts                      service-role client — webhook only

utils/supabase/                   existing: server.ts, client.ts, proxy.ts
utils/resend/                     existing: client.ts, send-invoice.ts

components/
  ui/                             shadcn components
  invoices/                       line-item editor, invoice form, status control,
                                  resend dialog, invoice preview, send history
  clients/                        client form, client picker combobox
  layout/                         sidebar, nav, user menu

supabase/migrations/              SQL migrations — see DB.md
docs/                             PRD.md, Tech.md, DB.md
```

**Data Access Layer.** All reads go through `lib/data/*`, which are server-only modules that take the caller's user id and return shaped view models — never raw rows straight to the client. This keeps the ownership check in one place instead of scattered across pages.

---

## 6. Authentication

Supabase Auth with email + password and email confirmation enabled.

- **Session transport** — `@supabase/ssr` cookie-based sessions. Already wired correctly in all three client factories.
- **Session refresh** — the root `proxy.ts` calls `updateSession` on every matched request. The comment in [utils/supabase/proxy.ts](../utils/supabase/proxy.ts) about not inserting code between `createServerClient` and `getUser()` is load-bearing; leave it alone.
- **Route protection** — proxy performs the cheap optimistic redirect (no session cookie → `/login`). The authoritative check is `requireUser()` in `(app)/layout.tsx` and again inside every action and data function.
- **Never** use `getSession()` on the server for authorization decisions — it reads the cookie without verifying it. Use `getUser()`.
- **Profile bootstrap** — a database trigger creates the `profiles` row when an `auth.users` row is created, so no application code has to handle the "profile missing" case.
- **Email templates** — Supabase Auth's own confirm and recovery emails. Their redirect targets point at `/auth/confirm`, which exchanges the token and forwards the user on.

---

## 7. Money, totals, and rounding

Money is **integer minor units (cents) end to end**. No floats touch an amount, anywhere — not in the database, not in the Server Action, not in the PDF.

- Storage: `bigint` cent columns (`unit_price_cents`, `subtotal_cents`, `tax_cents`, `total_cents`).
- VAT rates are stored as **basis points** in an integer column: 17 % → `1700`. This makes a 21.5 % rate expressible without a decimal type and keeps the tax multiplication exact.
- Quantity is `numeric(12,2)` — 7.5 hours has to be representable.

Rounding order, matching the PRD:

```
line_subtotal = round(quantity × unit_price_cents)
line_tax      = round(line_subtotal × vat_rate_bps / 10000)
subtotal      = Σ line_subtotal
tax           = Σ line_tax
total         = subtotal + tax
```

Line values are **generated columns** in Postgres and invoice totals are recomputed by a **trigger** (see [DB.md](DB.md) §6). The database is the single authority on arithmetic; `lib/invoice-totals.ts` mirrors the same formula purely so the form can show a live total while typing. If those two ever disagree it is a bug, and the database wins.

Formatting for display and PDF uses `Intl.NumberFormat` with an explicit `en-US` locale and the invoice's currency, driven from `lib/money.ts`. Formatting never re-derives an amount.

---

## 8. PDF generation

`@react-pdf/renderer`, invoked server-side. Chosen over Puppeteer because it needs no Chromium binary — which is what makes Puppeteer painful and slow on Vercel serverless — and over client-side jsPDF because font embedding and pagination there are unreliable.

**Flow.** The Server Action that saves an invoice, after the row and its line items are committed:

1. reads the invoice back from the database (so the PDF renders the *database's* totals, not the form's)
2. `renderToBuffer(<InvoiceDocument … />)`
3. uploads to Supabase Storage at `invoices/{user_id}/{invoice_id}.pdf` with `upsert: true`
4. records `pdf_path` and `pdf_generated_at` on the invoice

Editing an invoice repeats the same steps and overwrites the object.

**Fonts.** `Font.register` must be given a real TTF for the invoice typeface. The built-in Helvetica has no glyphs for `č ć ž š đ`, and client names and addresses will contain them — an unregistered font silently renders blanks or boxes. Noto Sans is already a project font; its TTF is checked in under `public/fonts/` and registered in `lib/pdf/fonts.ts`.

**Pagination.** Achieved with react-pdf's own primitives, not manual page math:

- `<View render={…} fixed>` for the `Page X of Y` footer
- the line-items table header marked `fixed` so it repeats on overflow
- the totals block wrapped in a `<View wrap={false}>` so it cannot be split, plus `minPresenceAhead` on the last table rows so the table never ends exactly at a page break with the totals orphaned overleaf

**Serving.** `GET /api/invoices/[id]/pdf` authenticates, confirms ownership, and streams the object. Storage stays private; the bucket is not public and object paths are not shareable. Short-lived signed URLs (60 s) are used only where a URL is unavoidable.

---

## 9. Stripe

### 9.1 Account model

**Connect with Express accounts and direct charges.** The client's payment is created *on the freelancer's connected account*; funds never enter a platform balance and no `application_fee_amount` is set. Stripe hosts the onboarding and KYC, so this application never handles identity documents or bank details.

Onboarding:

1. `stripe.accounts.create({ controller: … })` → store `acct_…` on the profile.
   `type: 'express'` is **deprecated** in the current API, so the Express preset
   is spelled out through `controller` instead — `stripe_dashboard.type: 'express'`,
   `fees.payer: 'application'`, `losses.payments: 'application'`,
   `requirement_collection: 'stripe'` — plus `card_payments` and `transfers`
   requested as capabilities. Same behaviour, non-deprecated parameter.
   **Note the fee model this implies:** with the Express preset the *platform*
   carries Stripe's processing fees and any negative balances, while §11.1 of
   the PRD takes no application fee to offset them.
2. `stripe.accountLinks.create({ account, refresh_url, return_url, type })` → redirect the user to Stripe.
   `account_onboarding` while the account is unfinished, `account_update` once it
   accepts charges, so the "Update details" button does not drop a live account
   back into onboarding.
3. Stripe returns the user to `/api/stripe/connect/return`, which re-reads the account and caches `charges_enabled` and `details_submitted` on the profile
4. `account.updated` webhooks keep those flags current afterwards

Because Express accounts are created through the Accounts API rather than a Standard OAuth handshake, **no `STRIPE_CONNECT_CLIENT_ID` is required**.

All Stripe calls that act on a user's behalf pass `{ stripeAccount: profile.stripe_account_id }`.

### 9.2 Payment links

The Payment Links API needs an existing Price, so creating a link for an invoice is three calls on the connected account:

```ts
const product = await stripe.products.create(
  { name: `Invoice ${invoice.invoice_number}` },
  { stripeAccount },
)
const price = await stripe.prices.create(
  { product: product.id, unit_amount: invoice.total_cents, currency: invoice.currency },
  { stripeAccount },
)
const link = await stripe.paymentLinks.create(
  {
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoice_id: invoice.id, user_id: invoice.user_id },
    after_completion: { type: 'hosted_confirmation' },
  },
  { stripeAccount },
)
```

`metadata.invoice_id` is what the webhook keys on. The one-off price makes the amount immutable, which matches the product decision that a link is created once and never revised.

`ensureInvoicePaymentLink(userId, invoiceId)` is the single entry point, and it is idempotent: an invoice that already has a link gets that link back untouched. It runs when an invoice is created, and again on send — the second call is what gives a link to invoices that were created *before* the user connected Stripe, which otherwise could never have one. An unconnected account, an account not yet cleared for charges, or a zero total all return `{ ok: true, url: null }`: nothing to create, not a failure.

Deleting an invoice calls `stripe.paymentLinks.update(id, { active: false }, { stripeAccount })` so a deleted invoice cannot still be paid.

### 9.3 Webhook

`app/api/stripe/webhook/route.ts` — a Route Handler, Node.js runtime, registered in Stripe as a **Connect** endpoint so it receives events from connected accounts.

```ts
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()                 // raw body — required
  const signature = (await headers()).get('stripe-signature')
  const event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!)
  // …
}
```

`await request.text()` before anything else: `constructEvent` verifies the signature against the *exact* bytes Stripe sent, so the body must not be parsed as JSON first.

**Subscribed events:** `checkout.session.completed`, `account.updated`.

**Handling `checkout.session.completed`:**

1. Insert the event id into `stripe_events`. A unique-violation means this event was already processed — return `200` and stop. This is the idempotency gate, and it is a database constraint rather than an application check so concurrent redeliveries cannot both pass.
2. Resolve the invoice from `session.metadata.invoice_id`, cross-checked against `event.account` matching that user's `stripe_account_id`.
3. Compare `session.amount_total` to `invoice.total_cents`:
   - **equal** → set `status = 'paid'`, `paid_at`, `paid_source = 'stripe'`, `stripe_confirmed_paid = true`
   - **not equal** → leave the status alone; set `amount_received_cents` and `payment_mismatch = true`
4. Return `200`. A non-2xx makes Stripe retry, which is correct only for genuine transient failures — a malformed or unknown event returns `200` with a logged warning so Stripe stops resending it.

Two consequences of putting the idempotency gate first:

- A transient failure *after* the gate row exists must **delete that row** before returning non-2xx. Otherwise Stripe's retry is waved through as a duplicate and the payment is never applied.
- `/api/stripe/webhook` is listed in `PUBLIC_ROUTES` in [proxy.ts](../proxy.ts). Stripe posts with no cookies, and the optimistic redirect would otherwise answer every delivery with a 307 to `/login`. The signature is the authentication on this route.

`checkout.session.completed` also arrives for asynchronous payment methods that have not settled, so a session whose `payment_status` is not `paid` is recorded and left alone. The amount comparison covers currency as well as value — the same integer in a different currency is a mismatch, not a match.

The webhook runs with the **service-role** Supabase client (`lib/supabase/admin.ts`) because there is no user session on the request. That client is used *only* here, and only on the resolved invoice id.

`stripe_confirmed_paid` is the flag that permanently locks the invoice against edit and delete, independent of the freely-toggleable `status`.

### 9.4 Local testing

```bash
stripe listen --forward-connect-to localhost:3000/api/stripe/webhook
```

`--forward-connect-to` rather than `--forward-to`: with direct charges the events originate on the connected account, and a plain `--forward-to` listener will not see them.

---

## 10. Email

Resend, building on the existing [utils/resend/send-invoice.ts](../utils/resend/send-invoice.ts).

Changes required to that module:

- copy rewritten to English (it is currently Croatian)
- the PDF added as an `attachments` entry, downloaded from Storage and base64-encoded
- the Stripe payment link rendered as the primary call-to-action button, alongside the existing PDF-download fallback
- `replyTo` set to the freelancer's profile email, so client replies reach the freelancer rather than the platform
- the existing `escapeHtml` helper kept and applied to every interpolated value; it is doing real work

Sending is gated on `stripe_charges_enabled`, per PRD §11.1: the email exists to carry the payment link, so until Stripe can take charges the Send button is disabled with *"Connect Stripe to collect payment"* and the action refuses the same way. The practical consequence is worth stating plainly — **a user who never connects Stripe can never email an invoice**, only download its PDF.

Sending happens in `lib/actions/send.ts` — a Server Action with a `requireUser()` check — not in an open route handler. Each attempt writes an `invoice_sends` row with the Resend message id or the error, and a successful first send sets `sent_at` on the invoice. Resend returns `{ data: null, error }` instead of throwing, which the existing client already handles correctly.

`RESEND_FROM` must move off `onboarding@resend.dev` to an address on the verified domain; in test mode that default only delivers to the account owner's own address.

---

## 11. Environment variables

Present in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RESEND_API_KEY
RESEND_FROM                       # currently onboarding@resend.dev — must change
```

Added since:

```
NEXT_PUBLIC_APP_URL               # absolute URLs for Stripe return links and email
SUPABASE_SERVICE_ROLE_KEY         # webhook only, never imported into client code
STRIPE_SECRET_KEY
```

Still to add:

```
STRIPE_WEBHOOK_SECRET             # `stripe listen` locally; the endpoint's own secret in production
```

This project uses Supabase's current API keys, so `SUPABASE_SERVICE_ROLE_KEY` holds an `sb_secret_…` key rather than a legacy `service_role` JWT. Same privileges, same rule: server-only, one importing module.

Without `STRIPE_WEBHOOK_SECRET` the webhook route answers `500 Webhook not configured` and nothing is processed. Everything else — onboarding, payment links, email — works without it.

Anything without the `NEXT_PUBLIC_` prefix stays server-only. `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are reachable from exactly one module each (`lib/supabase/admin.ts`, `lib/stripe/client.ts`), both server-only, so an accidental client import fails the build rather than shipping a key.

---

## 12. Security posture

| Concern | Control |
|---|---|
| Cross-user data access | Postgres RLS on every table, `user_id = (select auth.uid())`. Application code is the second line, not the first. |
| Server Action abuse | `requireUser()` + Zod + ownership re-read inside every action. Client sends an ID and a change, never a record. |
| PDF leakage | Private Storage bucket, RLS policies on `storage.objects`, downloads proxied through an authenticated route. No public URLs. |
| Webhook forgery | Stripe signature verification on the raw body, plus `event.account` cross-checked against the invoice owner's account id. |
| Webhook replay | Unique primary key on `stripe_events.id`. |
| Service-role key blast radius | One module, server-only, used solely by the webhook. |
| Financial record integrity | `stripe_confirmed_paid` locks edits and deletes at the database level via trigger, not only in the UI. |
| Email injection | `escapeHtml` on every interpolated value in the email template. |
| Open mail relay | The unauthenticated `app/api/invoices/send/route.ts` is deleted, not patched. |

---

## 13. Build order

1. **Database** — migrations, RLS, triggers, numbering function, Storage bucket and policies ([DB.md](DB.md)). Nothing else can be built first; the database is empty.
2. **Types** — `npx supabase gen types typescript` into `lib/database.types.ts`, wired into the Supabase client generics.
3. **Housekeeping** — delete `app/todos/`, delete the open send route, fix root metadata, add the shadcn components.
4. **Auth** — route groups, login / register / forgot / reset, `/auth/confirm`, `requireUser()`, proxy route protection.
5. **Profile & clients** — the simplest full vertical slice: form → Zod → action → RLS → list.
6. **Invoice creation** — line-item editor, numbering, totals, snapshotting.
7. **PDF** — document, fonts, pagination, storage, download route.
8. **Invoice list & detail** — search, filter, sort, pagination, status control, edit and delete rules.
9. **Stripe** — Connect onboarding, payment links, webhook, mismatch handling.
10. **Email** — send action, attachment, send log, resend dialog.
11. **Dashboard** — the aggregates, last because they depend on everything above.

---

## 14. Verification

**Automated / repeatable:**

```bash
npm run build        # Turbopack production build, type errors surface here
npm run lint         # eslint CLI — note `next lint` is gone in 16
npx next typegen     # regenerate PageProps / LayoutProps / RouteContext
```

**Database:** run the migrations against a Supabase branch first, then check `get_advisors` for missing-RLS and security warnings before merging.

**Stripe:** `stripe listen --forward-connect-to …` plus `stripe trigger checkout.session.completed`. Verify three cases by hand: exact-amount payment marks the invoice paid; a mismatched amount leaves it unpaid with the warning; replaying the same event id changes nothing the second time.

**PDF:** generate an invoice with 30 line items, mixed VAT rates, and a client name containing `č ć ž š đ`. Confirm the repeated table header, `Page X of Y`, an unsplit totals block, and correctly rendered accents.

**RLS:** sign in as a second user and attempt to read the first user's invoice, line items, and PDF path directly through the Supabase client. All must return empty rather than error — an error would mean the check is in the wrong layer.

**Email:** send to a real inbox and confirm the PDF attaches, the payment link resolves to the connected account's checkout page, and replying reaches the freelancer's address rather than the platform's.
