import { NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/utils/resend/send-invoice";

/**
 * ⚠️ OVAJ ENDPOINT JOS NIJE ZASTICEN.
 *
 * Bilo tko tko zna URL moze slati mailove preko tvog Resend racuna. Prije
 * deploya dodaj provjeru prijavljenog korisnika, npr.:
 *
 *   const supabase = createClient(await cookies());
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
 *
 * Trenutno je otvoren samo da mozes testirati slanje dok jos nema login flowa.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neispravan JSON" }, { status: 400 });
  }

  const { to, invoiceNumber, amount, currency, clientName, dueDate, pdfUrl } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof to !== "string" || !to.includes("@")) {
    return NextResponse.json(
      { error: "Polje 'to' mora biti email adresa" },
      { status: 400 },
    );
  }

  if (typeof invoiceNumber !== "string" || invoiceNumber.length === 0) {
    return NextResponse.json(
      { error: "Polje 'invoiceNumber' je obavezno" },
      { status: 400 },
    );
  }

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: "Polje 'amount' mora biti broj" },
      { status: 400 },
    );
  }

  try {
    const data = await sendInvoiceEmail({
      to,
      invoiceNumber,
      amount,
      currency: typeof currency === "string" ? currency : undefined,
      clientName: typeof clientName === "string" ? clientName : undefined,
      dueDate: typeof dueDate === "string" ? dueDate : undefined,
      pdfUrl: typeof pdfUrl === "string" ? pdfUrl : undefined,
    });

    return NextResponse.json({ id: data?.id }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nepoznata greška";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
