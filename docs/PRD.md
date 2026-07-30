# Invoice Generator — Product Requirements

**Status:** Approved for build
**Last updated:** 2026-07-30
**Companion documents:** [Tech.md](Tech.md) (architecture), [DB.md](DB.md) (data model)

---

## 1. Overview

Invoice Generator is a web application for freelancers to create, store, and send invoices to their clients.

A signed-in user can:

- manage their own client list
- create invoices from a fixed layout
- generate a PDF of every invoice
- generate a Stripe payment link for the exact invoice amount
- email the invoice and the payment link to the client in one click
- track whether an invoice is **paid** or **not paid**

There are no organizations, teams, seats, or branding customization. Every user manages only their own profile, their own clients, and their own invoices.

### Primary goal

One place where a freelancer can enter their own details, add a client, create an invoice, get a PDF, get a payment link, and send it all to the client with a single click.

### Explicitly out of scope for v1

- Teams, organizations, shared workspaces, roles beyond the single user
- Logo upload, custom colors, fonts, or any brand customization
- Discounts (invoice-level or per-line)
- Recurring or scheduled invoices
- Credit notes, proforma invoices, quotes, estimates
- Bank account details, late-payment interest, or invoice "type" fields on the invoice
- Partial payments and refund reconciliation
- Payment confirmation emails to the client (Stripe already sends its own receipt)
- Multi-language UI — English only
- Account deletion and data export

---

## 2. User role

There is exactly one role: **User**. A user can register, sign in, edit their profile and sender details, manage clients, create and send invoices, view their invoice history, change an invoice's status manually, and connect a Stripe account to collect payment.

No admin role, no support role, no impersonation.

---

## 3. Data ownership

Every user sees and uses only their own profile, their own clients, their own invoices, and their own PDFs. There is no path in the product through which one user can read or modify another user's data.

---

## 4. Authentication

Email and password sign-in.

| Flow | Behaviour |
|---|---|
| Register | Email + password. A confirmation email is sent, and the email must be confirmed before the user can sign in. |
| Login | Email + password. |
| Logout | Ends the session and returns to Login. |
| Forgot password | User submits their email, receives a reset link, sets a new password, and is signed in. |

**Entry point.** Visiting the site root while signed out goes straight to Login, with a link to Register. Visiting it while signed in redirects to the Dashboard. There is no marketing landing page.

---

## 5. Profile / sender details

The user's profile supplies the **From** block on every invoice.

| Field | Required |
|---|---|
| Full Name | optional |
| Company Name | optional |
| Email | optional |
| Address | optional |
| VAT ID | optional |
| Website | optional |
| Default currency | required, defaults to EUR |

All identity fields stay optional, as specified. The profile values are copied into each new invoice at the moment the invoice is created (see §7.1).

---

## 6. Client management

The user can create, view, edit, and delete clients.

| Field | Required |
|---|---|
| Full Name | optional |
| Company Name | optional |
| Email | optional |
| Address | optional |
| VAT ID | optional |

**One constraint on top of the spec:** a client must have either a Full Name or a Company Name, because that value is the client's label in the invoice dropdown and in the To block. Everything else stays optional.

**Client without an email.** The email field remains optional. An invoice for a client with no email address can still be created, saved, and downloaded as a PDF — but the **Send** and **Resend** buttons are disabled, with a tooltip reading *"This client has no email address."*

**Deleting a client.** Deletion is permanent and is allowed even when the client has invoices. Existing invoices are unaffected because each invoice holds its own copy of the client's details (§7.1). After deletion the invoice still displays the client exactly as it was billed; the client simply no longer appears in the dropdown for new invoices.

**Client list.** Searchable by name, company, or email. Paginated.

---

## 7. Invoice creation

The invoice follows one fixed layout. There are no customization options.

### 7.1 Header

| Field | Source |
|---|---|
| From | Copied from the user's profile at creation time |
| To | The client selected from the dropdown, copied at creation time |
| Invoice Number | Generated automatically, never entered by the user |
| Invoice Date | Defaults to today, editable |
| Due Date | Defaults to Invoice Date + 15 days, editable, must not precede the Invoice Date |
| Currency | One of EUR, USD, GBP, CHF, BAM — defaults to the profile's default currency |

Not included, by decision: bank account, interest, invoice type.

**Snapshotting.** Sender and client details are frozen onto the invoice when it is created. Editing a profile or a client later never alters an already-created invoice or its PDF. An issued invoice is a historical record.

### 7.2 Line items

The user adds as many rows as needed. Each row has:

| Field | Notes |
|---|---|
| Description | required |
| Quantity | required, greater than zero |
| Unit type | `hours` or `flat` |
| Price | required, zero or more |
| VAT Rate | a percentage; preset choices 0 %, 17 %, 21 %, plus a custom value |

**Unit type semantics:**

- `hours` — Price is an hourly rate. Line total = Quantity × Price. Printed as e.g. *8 hrs*.
- `flat` — Price is the whole fee for the item. Quantity is locked to 1 and the field is disabled. Printed as *flat*.

### 7.3 Totals

The system calculates and displays:

- **Subtotal** — the sum of all line totals before tax
- **Tax** — the sum of the tax on each line, each line taxed at its own VAT rate
- **Total** — Subtotal + Tax

All amounts are rounded to two decimal places per line, and the rounded line values are summed. The user never sees a total that disagrees with the lines above it by a rounding cent.

Because rates vary per line, both the invoice screen and the PDF show a **VAT breakdown** grouped by rate, e.g.

```
VAT 17 %    34.00
VAT  0 %     0.00
```

One invoice carries exactly one currency. Mixed-currency line items are not possible.

### 7.4 Footer

A free-text **Comments** field, printed at the bottom of the invoice.

### 7.5 Invoice numbering

Format: `INV-YYYY-MM-NNNN` — for example `INV-2026-07-0001`.

- Generated automatically; the user cannot enter or edit it.
- The counter is per user and **resets at the start of each month**.
- Numbers are never reused. Deleting an invoice leaves a permanent gap in the sequence.
- Two invoices created at the same instant can never receive the same number.

---

## 8. PDF

Every invoice has a PDF.

**Layout order:** header → sender and client blocks → invoice meta (number, invoice date, due date, currency) → line items table → subtotal / VAT breakdown / total → comments footer.

**Generation.** The PDF is produced when the invoice is saved and stored as the document belonging to that invoice. Editing an invoice regenerates and replaces its PDF.

**Access.** PDFs are private. Only the owning user can download their own PDFs; a link to a PDF is not guessable and not permanently valid.

**Multiple pages.** Invoices with many line items paginate correctly:

- the line items table header repeats on every page
- each page shows a `Page 1 of 2` footer
- the subtotal / VAT / total block is never separated from the end of the table onto a page of its own

**Language.** English.

---

## 9. Invoice list ("Previous invoices")

A paginated list, 20 per page, newest first by default. Each row shows: invoice number, client, invoice date, due date, total, status.

**Controls:**

- Search by invoice number or client name
- Filter by status: All / Paid / Not paid / Overdue
- Sort by invoice date or by total

**Row actions:** View, Edit, Delete, Resend, Download PDF — subject to the rules in §10 and §11.

**Badges.** A row can carry:

- **Overdue** — the invoice is not paid and its due date has passed
- **Edited after sending** — the invoice was changed after it was emailed and has not been resent, so the client is holding an outdated copy

---

## 10. Invoice status

Status has two values: **paid** and **not paid**. A new invoice starts as *not paid*.

Status changes in two ways:

1. **Automatically**, when Stripe confirms a successful payment for that invoice (§11.4).
2. **Manually**, by the user — for example after receiving a bank transfer.

The manual toggle is free in both directions and asks no questions. The user can mark a paid invoice as not paid, and vice versa. The system records how each payment was marked (Stripe or manual) but never blocks the toggle.

No payment confirmation emails are sent from this application.

---

## 11. Stripe

### 11.1 Connecting an account

Each user connects **their own Stripe account**. Money from a client's payment goes directly to the freelancer; it never passes through a platform balance, and no platform fee is taken.

Onboarding uses Stripe's own hosted flow (Stripe Express), so the user never enters identity or bank details into this application. A **Settings → Payments** screen shows the connection state: *Not connected* / *Onboarding incomplete* / *Connected*, with a button to start or resume onboarding.

**Before Stripe is connected**, the user can still do everything except collect payment: create clients, create invoices, generate and download PDFs. The **Send** button is disabled with the message *"Connect Stripe to collect payment"*.

### 11.2 The payment link

When an invoice is created, a Stripe payment link is generated for that invoice's exact total. The link is tied to the specific invoice, the specific client, and the total amount, and is created on the user's own connected Stripe account.

The link URL is stored with the invoice, shown on the invoice detail screen, and included in the email body.

### 11.3 Editing an invoice that already has a link

The payment link is created once and is **not** modified or replaced when the invoice is later edited. The link keeps its original amount for its whole life.

This is a deliberate trade-off, and §11.4 is the safety net that makes it safe: if a client pays an amount that no longer matches the invoice, the invoice is *not* silently marked paid.

### 11.4 Payment confirmation

When Stripe reports a successful payment:

- **If the amount paid equals the invoice total** — the invoice is marked **paid** automatically and the payment is recorded as Stripe-confirmed.
- **If the amount does not match** — the invoice stays **not paid**. The amount actually received is recorded, and the invoice screen shows a prominent warning:
  *"Payment amount mismatch — 500.00 EUR received, 800.00 EUR due."*
  The user resolves it manually.

A payment reported twice by Stripe is only ever applied once.

### 11.5 Locking

An invoice whose payment was **confirmed by Stripe** is permanently locked against editing and deletion, even if the user later toggles its status back to *not paid*. Real money moved; the record must not be rewritten.

An invoice marked paid **manually** carries no such permanent lock — the user can toggle it back to *not paid* and then edit or delete it.

---

## 12. Sending the invoice

One click sends the invoice to the client's email address.

The email contains:

- a short message in the body
- the invoice PDF as an attachment
- the Stripe payment link in the body

**Sender identity.** Email is sent from the application's own verified domain, with **Reply-To set to the freelancer's email address**, so anything the client replies goes to the freelancer, not to the platform.

**Send history.** Every send attempt is logged and shown on the invoice detail screen: timestamp, recipient address, and whether it succeeded or failed with the error. A failed send is reported to the user clearly and can be retried; nothing is retried silently.

### 12.1 Resend flow

If the user edits an invoice that was already sent, a dialog asks whether to resend it to the client. Nothing is resent without that confirmation.

If the user declines, the invoice keeps an **Edited after sending** badge until it is actually resent, so it stays visible that the client holds an outdated copy.

---

## 13. Deleting an invoice

Only invoices that are **not paid** can be deleted, and never one whose payment Stripe confirmed (§11.5).

Deleting an invoice permanently removes the invoice and its PDF, and deactivates its Stripe payment link so nobody can still pay a deleted invoice. The invoice number is retired and leaves a gap in the sequence.

---

## 14. Editing an invoice

Only invoices that are **not paid** can be edited, and never one whose payment Stripe confirmed (§11.5). A paid invoice must be toggled to *not paid* first, which the user is free to do.

Editing can change dates, currency, client, line items, and comments. It regenerates the PDF, marks the invoice as edited-after-sending if it had been sent, and triggers the resend dialog. It does **not** change the invoice number and does **not** create a new payment link.

---

## 15. Screens

| Screen | Contents |
|---|---|
| Auth entry (`/`) | Redirects to Login when signed out, Dashboard when signed in |
| Register | Email, password, confirmation notice |
| Login | Email, password, links to Register and Forgot password |
| Forgot password | Request a reset link |
| Reset password | Set a new password from the emailed link |
| Dashboard | Total outstanding, total paid this month, count of unpaid invoices, recent invoices, prominent **New invoice** button |
| Create / Edit invoice | Sender block (read-only, from profile), client dropdown, invoice meta, line item editor with live Subtotal / VAT breakdown / Total, comments, Save |
| Previous invoices | The list described in §9 |
| Invoice detail | Full invoice preview, status control, payment link, payment mismatch warning if any, send history, and the actions from §9 |
| Clients list | Searchable, paginated, with add / edit / delete |
| Add / Edit client | The fields in §6 |
| Settings → Profile | Sender details and default currency |
| Settings → Payments | Stripe connection state and onboarding |

---

## 16. Non-functional requirements

- **Responsive** — usable on phone, tablet, and desktop. The line item editor and the invoice table must both work on a narrow screen.
- **Validation** — every form validates on the client for feedback and on the server as the real gate. Server-side validation is never skipped because the UI already checked.
- **PDF quality** — consistent, legible, correctly paginated, and correct with accented characters (č, ć, ž, š, đ) in names and addresses.
- **Reliable Stripe webhook handling** — signatures verified, repeat deliveries applied once, failures visible rather than silent.
- **Email error handling** — send failures surface to the user with a real message and are recorded.
- **Security** — all data access requires authentication and is enforced per-row at the database level, not only in application code.

---

## 17. Acceptance criteria

The build is complete when all of the following hold:

1. A new user can register, confirm their email, sign in, and reset a forgotten password.
2. A signed-in user can save their sender details and see them appear on a new invoice.
3. A user can create, edit, and delete clients, and a client with no email cannot be sent to.
4. Deleting a client leaves that client's existing invoices displaying the original billing details.
5. An invoice created in July 2026 gets `INV-2026-07-0001`; the next gets `-0002`; the first invoice of August 2026 gets `INV-2026-08-0001`.
6. Line items with mixed VAT rates produce a correct Subtotal, per-rate VAT breakdown, and Total, with no rounding drift.
7. A `flat` line item locks quantity to 1; an `hours` line item multiplies quantity by rate.
8. Saving an invoice produces a downloadable PDF matching the fixed layout, and a 30-line invoice paginates with a repeated table header and `Page X of Y`.
9. Another user's invoice PDF cannot be reached by any means.
10. A user can complete Stripe onboarding, and an invoice created afterwards carries a working payment link for the exact total.
11. Paying that link marks the invoice paid automatically; delivering the same Stripe event twice does not double-apply it.
12. Paying an amount that does not match the total leaves the invoice unpaid and shows the mismatch warning.
13. Sending an invoice delivers an email with the PDF attached and the payment link in the body, with Reply-To set to the freelancer.
14. Editing a previously sent invoice raises the resend dialog; declining leaves the *Edited after sending* badge.
15. A Stripe-confirmed invoice cannot be edited or deleted even after being toggled to *not paid*; a manually-paid one can.
16. Deleting an unpaid invoice removes its PDF and deactivates its payment link.
17. The invoice list searches, filters by status including Overdue, sorts, and paginates at 20 per page.
