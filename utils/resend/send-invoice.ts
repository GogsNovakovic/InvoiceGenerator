import { getResend, RESEND_FROM } from "./client";

export type InvoiceEmailInput = {
  to: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  clientName?: string;
  /** ISO datum, npr. "2026-08-15" */
  dueDate?: string;
  /** Link na PDF racuna, ako ga vec imas */
  pdfUrl?: string;
};

const formatAmount = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("hr-HR", { style: "currency", currency }).format(amount);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("hr-HR", { dateStyle: "long" }).format(new Date(iso));

/**
 * Escape korisnickog sadrzaja prije umetanja u HTML predlozak. Ime klijenta i
 * broj racuna dolaze iz baze, pa bez ovoga navodnik ili `<` razbije markup.
 */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderHtml = ({
  invoiceNumber,
  amount,
  currency,
  clientName,
  dueDate,
  pdfUrl,
}: InvoiceEmailInput) => {
  const pozdrav = clientName ? `Poštovani ${escapeHtml(clientName)},` : "Poštovani,";
  const broj = escapeHtml(invoiceNumber);

  return `<!doctype html>
<html lang="hr">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 24px;font-size:20px;font-weight:600;">Račun ${broj}</h1>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
            ${pozdrav}<br />
            u prilogu vam dostavljamo račun ${broj}.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;font-size:15px;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;">Iznos</td>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;text-align:right;font-weight:600;">${formatAmount(amount, currency)}</td>
            </tr>
            ${
              dueDate
                ? `<tr>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;">Dospijeće</td>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;text-align:right;">${formatDate(dueDate)}</td>
            </tr>`
                : ""
            }
          </table>

          ${
            pdfUrl
              ? `<a href="${encodeURI(pdfUrl)}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500;">Preuzmi PDF</a>`
              : ""
          }

          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">
            Ako imate pitanja o ovom računu, samo odgovorite na ovaj email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

/** Plain-text inacica — bez nje mnogi spam filteri boduju mail losije. */
const renderText = ({
  invoiceNumber,
  amount,
  currency,
  clientName,
  dueDate,
  pdfUrl,
}: InvoiceEmailInput) =>
  [
    clientName ? `Poštovani ${clientName},` : "Poštovani,",
    "",
    `U prilogu vam dostavljamo račun ${invoiceNumber}.`,
    "",
    `Iznos: ${formatAmount(amount, currency)}`,
    dueDate ? `Dospijeće: ${formatDate(dueDate)}` : null,
    pdfUrl ? `\nPreuzmi PDF: ${pdfUrl}` : null,
    "",
    "Ako imate pitanja o ovom računu, samo odgovorite na ovaj email.",
  ]
    .filter(Boolean)
    .join("\n");

export const sendInvoiceEmail = async (input: InvoiceEmailInput) => {
  const { data, error } = await getResend().emails.send({
    from: RESEND_FROM,
    to: input.to,
    subject: `Račun ${input.invoiceNumber}`,
    html: renderHtml(input),
    text: renderText(input),
  });

  // Resend ne baca iznimku na API gresku — vraca { data: null, error }.
  if (error) {
    throw new Error(`Resend (${error.name}): ${error.message}`);
  }

  return data;
};
