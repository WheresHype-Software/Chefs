"use server";

import { announceBooking } from "@/lib/notify/discord";
import { cookies } from "next/headers";
import { z } from "zod";
import { bookingTokenCookieName, bookingTokenCookieOptions } from "@/lib/booking-token";
import { sendEmail, siteUrl } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { createAdminClient } from "@/lib/supabase/admin";
import { failInvalid } from "@/lib/result";
import { createAnonClient, createClient, hasSupabase } from "@/lib/supabase/server";
import { titledName } from "@/lib/format";
import { paymentsLive } from "@/lib/settings";

const BookingInput = z.object({
  offerId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().min(1).max(60),
  guests: z.number().int().min(1).max(200),
  name: z.string().trim().min(2, "Indique o seu nome").max(120),
  email: z.string().trim().email("Email inválido"),
  phone: z.string().trim().min(6, "Indique o telemóvel").max(30),
  address: z.string().trim().max(300).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const BOOKING_LABELS: Record<string, string> = {
  offerId: "Escolha uma oferta.",
  date: "Escolha um dia no calendário.",
  time: "Escolha uma hora.",
  guests: "Pessoas",
  name: "Indique o seu nome.",
  email: "O email não parece válido.",
  phone: "Indique um número de telemóvel.",
  address: "Morada",
  notes: "Notas para o chef",
};

export type BookingResult =
  | {
      ok: true;
      bookingId: string;
      ref: string;
      link: string;
      /** Full link with the guest token: the way back to the booking without an account. */
      privateLink: string;
      /** Whether the confirmation email actually went out. */
      emailed: boolean;
    }
  | { ok: false; error: string };

const RPC_ERRORS: Record<string, string> = {
  invalid_email: "O email não parece válido.",
  phone_required: "Indique um número de telemóvel.",
  offer_not_found: "Esta oferta já não está disponível.",
  chef_not_available: "Este chef não está disponível de momento.",
  guests_out_of_range: "O número de pessoas está fora do que o chef aceita para esta oferta.",
  too_late_for_this_date: "Já não há tempo para preparar esta data. Escolha um dia mais à frente.",
  date_not_available: "Esse dia já não está livre. Escolha outro.",
  address_required: "Indique a morada.",
  outside_service_area: "A morada fica fora da área de serviço deste chef.",
  too_many_requests: "Enviou muitos pedidos na última hora. Tente mais tarde.",
  cannot_book_own_offer: "Não pode reservar a sua própria oferta. Para testar, use uma janela privada e um email diferente.",
};

export async function requestBooking(input: z.infer<typeof BookingInput>): Promise<BookingResult> {
  const parsed = BookingInput.safeParse(input);
  if (!parsed.success) {
    const invalid = failInvalid(parsed.error, BOOKING_LABELS);
    return { ok: false, error: invalid.ok ? "" : invalid.error };
  }
  const b = parsed.data;

  if (!hasSupabase) {
    // Demo mode: nothing is stored, the status page shows an example booking.
    return { ok: true, bookingId: "demo", ref: "AL-DEMO", link: "/reserva/demo", privateLink: siteUrl("/reserva/demo"), emailed: false };
  }

  const sb = await createClient();
  const { data, error } = await sb.rpc("request_booking", {
    p_offer_id: b.offerId,
    p_date: b.date,
    p_time: b.time,
    p_guests: b.guests,
    p_name: b.name,
    p_email: b.email,
    p_phone: b.phone,
    p_address: b.address ?? null,
    p_lat: b.lat ?? null,
    p_lng: b.lng ?? null,
    p_notes: b.notes ?? null,
  });
  if (error) {
    const key = Object.keys(RPC_ERRORS).find((k) => error.message.includes(k));
    if (!key) console.error("[action] requestBooking:", error);
    return { ok: false, error: key ? RPC_ERRORS[key]! : "Não foi possível enviar o pedido. Tente de novo dentro de momentos." };
  }

  const r = data as { bookingId: string; ref: string; token: string; chefName: string };
  const { data: offer } = await sb.from("offers").select("title, fulfilment_mode, chefs(badges)").eq("id", b.offerId).maybeSingle();
  const chefName = titledName({ name: r.chefName, badges: (offer?.chefs as unknown as { badges: string[] } | null)?.badges ?? [] });
  // This browser gets the token as an httpOnly cookie; the email carries it once in the link.
  (await cookies()).set(bookingTokenCookieName(r.bookingId), r.token, bookingTokenCookieOptions(r.bookingId));
  const link = `/reserva/${r.bookingId}`;
  const emailLink = `${link}?t=${r.token}`;
  // The booking exists from here on: email problems are logged, never shown as a failed request.
  const live = await paymentsLive();
  const clientDoc = renderEmail({
    preheader: `${chefName} tem 48 horas para responder ao seu pedido.`,
    heading: `Pedido enviado a ${chefName}`,
    lead: `Olá ${b.name.split(" ")[0]}. O seu pedido seguiu e ${chefName} tem 48 horas para aceitar, recusar ou propor outra data.`,
    facts: [
      ["Pedido", r.ref],
      ["Quando", `${b.date} · ${b.time}`],
      ["Pessoas / unidades", String(b.guests)],
    ],
    paragraphs: [
      live
        ? `Ainda não paga nada. Se ${chefName} aceitar, pedimos-lhe um sinal para confirmar a data; o restante valor é combinado diretamente com o chef.`
        : "Ainda não paga nada: o pagamento é combinado diretamente com o chef.",
    ],
    cta: { label: "Acompanhar o pedido", href: siteUrl(emailLink) },
    footnote: "Guarde este email: a ligação acima é a sua forma de abrir o pedido e falar com o chef, sem criar conta.",
  });
  const emailed = await sendEmail({
    to: b.email,
    subject: `Pedido ${r.ref} enviado a ${chefName}`,
    text: clientDoc.text,
    html: clientDoc.html,
  }).catch((err) => {
    console.error("[action] requestBooking client email:", err);
    return false;
  });
  await notifyChef(r.bookingId, r.ref, b).catch((err) => console.error("[action] requestBooking chef email:", err));
  await announceBooking({
    ref: r.ref,
    chefName,
    clientName: b.name,
    guests: b.guests,
    offerTitle: (offer?.title as string | undefined) ?? "Oferta",
    mode: (offer?.fulfilment_mode as string | undefined) ?? null,
    date: b.date,
    time: b.time,
    notes: b.notes,
  });
  return { ok: true, bookingId: r.bookingId, ref: r.ref, link, privateLink: siteUrl(emailLink), emailed };
}

async function notifyChef(bookingId: string, ref: string, b: z.infer<typeof BookingInput>) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin.from("bookings").select("offer_title, chefs(display_name, profiles(email))").eq("id", bookingId).single();
  const chef = data?.chefs as unknown as { display_name: string; profiles: { email: string } | null } | null;
  if (!chef?.profiles?.email) return;
  const doc = renderEmail({
    preheader: `${b.name} quer reservar ${data?.offer_title} para ${b.date}.`,
    heading: "Tem um pedido novo",
    lead: `Olá ${chef.display_name.split(" ")[0]}. ${b.name} enviou um pedido e está à espera da sua resposta.`,
    facts: [
      ["Serviço", data?.offer_title ?? "—"],
      ["Quando", `${b.date} · ${b.time}`],
      ["Pessoas / unidades", String(b.guests)],
      ...((b.address ? [["Onde", b.address]] : []) as [string, string][]),
    ],
    paragraphs: b.notes ? [`O que o cliente escreveu: «${b.notes}»`] : [],
    cta: { label: "Responder ao pedido", href: siteUrl(`/dashboard/pedidos/${bookingId}`) },
    footnote: "Tem 48 horas para aceitar, recusar ou propor outra data. Depois disso o pedido expira sozinho.",
  });
  await sendEmail({ to: chef.profiles.email, subject: `Novo pedido ${ref}: ${data?.offer_title}`, text: doc.text, html: doc.html });
}

const LookupInput = z.object({
  ref: z.string().trim().min(3).max(40),
  email: z.string().trim().email(),
});

export type LookupResult = { ok: true; link: string } | { ok: false; error: string };

/** "Acompanhar pedido": booking number + email → a fresh guest token in this browser → the booking page. */
export async function findGuestBooking(input: z.infer<typeof LookupInput>): Promise<LookupResult> {
  const parsed = LookupInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.path[0] === "email" ? "O email não parece válido." : "Indique o número do pedido." };
  }
  if (!hasSupabase) return { ok: true, link: "/reserva/demo" };
  // People type "1027-0482", "al 1027 0482" or "AL-1027-0482": normalise to the stored form.
  const digits = parsed.data.ref
    .toUpperCase()
    .replace(/^AL/, "")
    .replace(/[^0-9]/g, "");
  const ref = digits.length === 8 ? `AL-${digits.slice(0, 4)}-${digits.slice(4)}` : parsed.data.ref.toUpperCase();
  const { data, error } = await createAnonClient().rpc("find_guest_booking", { p_ref: ref, p_email: parsed.data.email });
  if (error) {
    if (error.message.includes("too_many_attempts")) return { ok: false, error: "Demasiadas tentativas. Tente de novo daqui a uma hora." };
    console.error("[action] findGuestBooking:", error);
    return { ok: false, error: "Não foi possível procurar o pedido. Tente de novo dentro de momentos." };
  }
  const found = data as { bookingId: string; token: string } | null;
  if (!found) return { ok: false, error: "Não encontrámos um pedido com esse número e esse email." };
  (await cookies()).set(bookingTokenCookieName(found.bookingId), found.token, bookingTokenCookieOptions(found.bookingId));
  return { ok: true, link: `/reserva/${found.bookingId}` };
}
