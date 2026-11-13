"use server";

import { revalidateLocalized } from "@/lib/i18n/server";
import { z } from "zod";
import { getSession } from "@/lib/dashboard";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { fail, failWith, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

/** Answering someone. The reply is both stored and emailed, so the thread is the whole story. */
const Reply = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(2).max(8000) });

async function adminClient() {
  const session = await getSession();
  if (session.demo || session.role !== "admin") return null;
  return createClient();
}

export async function replyToTicket(input: z.infer<typeof Reply>): Promise<ActionResult> {
  const sb = await adminClient();
  if (!sb) return fail("Sem permissão.");
  const parsed = Reply.safeParse(input);
  if (!parsed.success) return fail("Escreva a resposta.");

  const { data: ticket } = await sb
    .from("support_tickets")
    .select("ref, name, email, subject")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (!ticket) return fail("Mensagem não encontrada.");

  const { error } = await sb.rpc("reply_to_ticket", { p_ticket: parsed.data.ticketId, p_body: parsed.data.body });
  if (error) return failWith(error, "replyToTicket", "Não foi possível guardar a resposta.");

  const doc = renderEmail({
    preheader: `Resposta ao seu pedido ${ticket.ref}`,
    heading: `Olá ${String(ticket.name).split(" ")[0]}`,
    paragraphs: parsed.data.body.split(/\n{2,}/).map((p) => p.trim()),
    footnote: `Referência ${ticket.ref}. Responda a este email se precisar de mais alguma coisa.`,
  });
  await sendEmail({ to: ticket.email as string, subject: `Re: ${ticket.subject} · ${ticket.ref}`, text: doc.text, html: doc.html }).catch(
    (err) => console.error("[support] reply email:", err),
  );

  revalidateLocalized("/admin/apoio");
  return ok();
}

export async function setTicketStatus(ticketId: string, status: "open" | "answered" | "closed"): Promise<ActionResult> {
  const sb = await adminClient();
  if (!sb) return fail("Sem permissão.");
  if (!z.string().uuid().safeParse(ticketId).success) return fail("Mensagem inválida.");
  const { error } = await sb.rpc("set_ticket_status", { p_ticket: ticketId, p_status: status });
  if (error) return failWith(error, "setTicketStatus", "Não foi possível alterar o estado.");
  revalidateLocalized("/admin/apoio");
  return ok();
}
