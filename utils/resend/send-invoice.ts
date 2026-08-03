import { getResend, RESEND_FROM } from "./client";

/**
 * The invoice email: a short body, the PDF attached, and — once the Stripe
 * slice lands — the payment link as the primary call to action
 * (docs/PRD.md §12).
 *
 * `replyTo` is the freelancer's own address, so anything the client replies
 * reaches them rather than this platform.
 *
 * ⚠️ `RESEND_FROM` is still `onboarding@resend.dev`, which in Resend test mode
 * only delivers to the account owner's own address. It has to move to an
 * address on a verified domain before any real client can be emailed
 * (docs/Tech.md §10).
 */

export type InvoiceEmailInput = {
  to: string;
  replyTo?: string | null;
  invoiceNumber: string;
  /** Preformatted by lib/money.ts — this module never touches an amount. */
  formattedTotal: string;
  formattedDueDate: string;
  senderName: string;
  clientName?: string | null;
  /** The optional note the sender typed into the send dialog. */
  note?: string | null;
  /** Null until Stripe lands; the body simply omits the button. */
  paymentLinkUrl?: string | null;
  pdf: { filename: string; content: Buffer };
};

/**
 * Every interpolated value is escaped. Client names, invoice numbers and the
 * sender's note are all user-controlled, so a stray `<` or quote would
 * otherwise break the markup — or worse (docs/Tech.md §12).
 */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderHtml = (input: InvoiceEmailInput) => {
  const greeting = input.clientName
    ? `Hello ${escapeHtml(input.clientName)},`
    : "Hello,";
  const number = escapeHtml(input.invoiceNumber);
  const sender = escapeHtml(input.senderName);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 24px;font-size:20px;font-weight:600;">Invoice ${number}</h1>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
            ${greeting}<br />
            please find invoice ${number} from ${sender} attached to this email as a PDF.
          </p>

          ${
            input.note
              ? `<p style="margin:0 0 24px;padding:12px 16px;background:#f4f4f5;border-radius:6px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(
                  input.note,
                )}</p>`
              : ""
          }

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;font-size:15px;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;">Amount due</td>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;text-align:right;font-weight:600;">${escapeHtml(
                input.formattedTotal,
              )}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;">Due date</td>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;text-align:right;">${escapeHtml(
                input.formattedDueDate,
              )}</td>
            </tr>
          </table>

          ${
            input.paymentLinkUrl
              ? `<a href="${encodeURI(
                  input.paymentLinkUrl,
                )}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500;">Pay this invoice</a>`
              : ""
          }

          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">
            If you have any questions about this invoice, just reply to this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

/** Plain-text alternative — without one, many spam filters score the mail worse. */
const renderText = (input: InvoiceEmailInput) =>
  [
    input.clientName ? `Hello ${input.clientName},` : "Hello,",
    "",
    `Please find invoice ${input.invoiceNumber} from ${input.senderName} attached to this email as a PDF.`,
    input.note ? `\n${input.note}` : null,
    "",
    `Amount due: ${input.formattedTotal}`,
    `Due date: ${input.formattedDueDate}`,
    input.paymentLinkUrl ? `\nPay this invoice: ${input.paymentLinkUrl}` : null,
    "",
    "If you have any questions about this invoice, just reply to this email.",
  ]
    .filter((line) => line !== null)
    .join("\n");

export type SendInvoiceEmailResult =
  | { ok: true; messageId: string | null }
  | { ok: false; message: string };

/**
 * Resend answers with `{ data: null, error }` rather than throwing, so both
 * outcomes come back as values and the caller logs either one to
 * `invoice_sends`. Nothing is ever retried silently (docs/PRD.md §12).
 */
export const sendInvoiceEmail = async (
  input: InvoiceEmailInput,
): Promise<SendInvoiceEmailResult> => {
  try {
    const { data, error } = await getResend().emails.send({
      from: RESEND_FROM,
      to: input.to,
      replyTo: input.replyTo ?? undefined,
      subject: `Invoice ${input.invoiceNumber} from ${input.senderName}`,
      html: renderHtml(input),
      text: renderText(input),
      attachments: [
        {
          filename: input.pdf.filename,
          content: input.pdf.content.toString("base64"),
        },
      ],
    });

    if (error) {
      return { ok: false, message: `${error.name}: ${error.message}` };
    }

    return { ok: true, messageId: data?.id ?? null };
  } catch (error) {
    // A missing RESEND_API_KEY throws out of the lazy client rather than
    // returning an error object, and that has to reach the send log too.
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown email error.",
    };
  }
};
