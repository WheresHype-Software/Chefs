"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sendEmail, siteUrl } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { notifyAdmin } from "@/lib/email";
import { COMPLAINTS_BOOK_URL } from "@/lib/legal";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { failWith } from "@/lib/result";
import { createAnonClient, createClient, hasSupabase } from "@/lib/supabase/server";

/**
 * The support form.
 *
 * A public endpoint that writes to the database, so it is limited twice — once here, per address,
 * and once in the database, per email and per network — and it never says more than it should: a
 * rejected message gets the same plain answer whatever went wrong.
 */

const TicketInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  category: z.enum(["reserva", "pagamento", "conta", "chef", "outro"]),
  bookingRef: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(8000),
  /** Always empty for a person; a robot fills everything in. */
  website: z.string().max(0).optional(),
});

export type TicketResult = { ok: true; ref: string } | { ok: false; error: string };

export async function submitTicket(input: z.infer<typeof TicketInput>): Promise<TicketResult> {
  const parsed = TicketInput.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const labels: Record<string, string> = {
      name: "Indique o seu nome.",
      email: "O email não parece válido.",
      subject: "Escreva um assunto.",
      body: "Escreva a sua mensagem com algum detalhe.",
      website: "Não foi possível enviar a mensagem.",
    };
    return { ok: false, error: labels[field] ?? "Verifique os dados do formulário." };
  }
  const t = parsed.data;

  if (!hasSupabase) return { ok: true, ref: "AP-DEMO" };

  const ip = callerIp(await headers());
  const limit = rateLimit(`support:${ip}`, 5, 3600);
  if (!limit.allowed) return { ok: false, error: "Recebemos várias mensagens suas. Dê-nos um pouco de tempo para responder." };

  // Anonymous client when nobody is signed in, so a guest can write without an account.
  const signedIn = await createClient();
  const {
    data: { user },
  } = await signedIn.auth.getUser();
  const sb = user ? signedIn : createAnonClient();

  const { data, error } = await sb.rpc("create_support_ticket", {
    p_name: t.name,
    p_email: t.email,
    p_phone: t.phone ?? null,
    p_category: t.category,
    p_subject: t.subject,
    p_body: t.body,
    p_booking_ref: t.bookingRef ?? null,
    p_ip: ip,
  });
  if (error) {
    if (error.message.includes("too_many_requests")) {
      return { ok: false, error: "Recebemos várias mensagens suas. Dê-nos um pouco de tempo para responder." };
    }
    const failure = failWith(error, "submitTicket", "Não foi possível enviar a mensagem. Tente de novo dentro de momentos.");
    return { ok: false, error: failure.ok ? "" : failure.error };
  }

  const ticket = data as { id: string; ref: string };

  // Best effort from here: the message is already saved, so an email problem must not undo it.
  const receipt = renderEmail({
    preheader: `Recebemos a sua mensagem (${ticket.ref})`,
    heading: "Recebemos a sua mensagem",
    lead: "Respondemos normalmente no mesmo dia útil.",
    facts: [
      ["Referência", ticket.ref],
      ["Assunto", t.subject],
    ],
    paragraphs: [
      "Se precisar de acrescentar alguma coisa, responda a este email e mencione a referência.",
      `Tem também à disposição o Livro de Reclamações: ${COMPLAINTS_BOOK_URL}`,
    ],
  });
  await sendEmail({ to: t.email, subject: `Recebemos a sua mensagem · ${ticket.ref}`, text: receipt.text, html: receipt.html }).catch(
    (err) => console.error("[support] receipt email:", err),
  );
  await notifyAdmin({
    subject: `Apoio · ${ticket.ref} · ${t.subject}`,
    preheader: t.subject,
    heading: `Nova mensagem de apoio (${t.category})`,
    lead: t.subject,
    facts: [
      ["De", `${t.name} · ${t.email}`],
      ...(t.bookingRef ? ([["Reserva", t.bookingRef]] as [string, string][]) : []),
      ["Referência", ticket.ref],
    ],
    paragraphs: [t.body.slice(0, 1200)],
    cta: { label: "Abrir no painel", href: siteUrl("/admin/apoio") },
  }).catch((err) => console.error("[support] admin email:", err));

  return { ok: true, ref: ticket.ref };
}
