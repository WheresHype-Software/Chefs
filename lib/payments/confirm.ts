import "server-only";
import { sendEmail, siteUrl } from "../email";
import { renderEmail } from "../email-template";
import { euro } from "../format";
import { createAdminClient } from "../supabase/admin";
import { eupago } from "./eupago";
import type { ProviderStatus } from "./types";

/**
 * The only place a payment is allowed to change state.
 *
 * A webhook is a nudge, not evidence: whatever arrives, this asks EuPago directly and acts on the
 * answer. Everything else — the five-minute poll from the client's screen, the hourly catch-up
 * job, an admin pressing "check again" — comes through here too, so there is one path to audit
 * and one place where "paid" can be decided.
 *
 * Safe to run twice: the database functions return false for the call that changed nothing, and
 * emails only go out on the call that did.
 */

export type SyncOutcome = {
  changed: boolean;
  status: ProviderStatus["status"];
  paymentId: string;
  /** Set when the provider's amount does not match ours — never treated as settled. */
  mismatch?: string;
};

type PaymentRow = {
  id: string;
  booking_id: string;
  method: "mbway" | "multibanco" | "card";
  amount: string | number;
  status: string;
  provider_reference: string | null;
  provider_transaction_id: string | null;
  mb_entity: string | null;
};

const PAYMENT_COLUMNS = "id, booking_id, method, amount, status, provider_reference, provider_transaction_id, mb_entity";

/** Looks a payment up by our id, by the provider's reference, or by their transaction id. */
export async function findPayment(by: { id?: string; reference?: string; transactionId?: string }): Promise<PaymentRow | null> {
  const sb = createAdminClient();
  if (!sb) return null;
  let query = sb.from("payments").select(PAYMENT_COLUMNS).limit(1);
  if (by.id) query = query.eq("id", by.id);
  else if (by.reference) query = query.eq("provider_reference", by.reference);
  else if (by.transactionId) query = query.eq("provider_transaction_id", by.transactionId);
  else return null;
  const { data } = await query.maybeSingle();
  return (data as PaymentRow | null) ?? null;
}

/**
 * Asks the provider what happened and applies it. `trigger` is only for the audit trail — it has
 * no say in the outcome.
 */
export async function syncPayment(payment: PaymentRow, trigger: "webhook" | "poll" | "admin" = "poll"): Promise<SyncOutcome> {
  const sb = createAdminClient();
  if (!sb) return { changed: false, status: "unknown", paymentId: payment.id };

  const result = await eupago.status({
    reference: payment.provider_reference,
    entity: payment.mb_entity,
    transactionId: payment.provider_transaction_id,
  });

  if (!result.ok) {
    await sb.rpc("record_payment_event", {
      p_payment: payment.id,
      p_source: trigger,
      p_type: "status_unavailable",
      p_signature_valid: true,
      p_reference: payment.provider_reference,
      p_trid: payment.provider_transaction_id,
      p_payload: { error: result.code ?? "unreachable" },
    });
    return { changed: false, status: "unknown", paymentId: payment.id };
  }

  const state = result.data;
  await sb.rpc("record_payment_event", {
    p_payment: payment.id,
    p_source: trigger,
    p_type: `status:${state.status}`,
    p_signature_valid: true,
    p_reference: payment.provider_reference,
    p_trid: state.providerTransactionId ?? payment.provider_transaction_id,
    p_payload: (state.raw ?? {}) as Record<string, unknown>,
  });

  if (state.status === "paid") {
    const { data, error } = await sb.rpc("mark_payment_paid", {
      p_payment: payment.id,
      p_trid: state.providerTransactionId ?? payment.provider_transaction_id ?? "",
      p_amount: state.amountCents == null ? null : state.amountCents / 100,
    });
    if (error) {
      // An amount that does not match ours is a red flag, not a payment. It stays unpaid and the
      // team is told, because silently accepting it is how a marketplace loses money.
      console.error("[payments] mark_payment_paid:", error.message);
      const mismatch = error.message.includes("amount_mismatch") ? error.message : undefined;
      if (mismatch) await alertAdmin(payment, mismatch);
      return { changed: false, status: "paid", paymentId: payment.id, mismatch };
    }
    if (data === true) await announcePaid(payment.booking_id);
    return { changed: data === true, status: "paid", paymentId: payment.id };
  }

  if (state.status === "failed" || state.status === "expired") {
    const { data } = await sb.rpc("mark_payment_unpaid", { p_payment: payment.id, p_status: state.status });
    return { changed: data === true, status: state.status, paymentId: payment.id };
  }

  return { changed: false, status: state.status, paymentId: payment.id };
}

/** Pending payments older than a few minutes, for the catch-up job. */
export async function reconcilePending(limit = 50): Promise<{ checked: number; changed: number }> {
  const sb = createAdminClient();
  if (!sb) return { checked: 0, changed: 0 };
  const { data } = await sb
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .in("status", ["created", "pending"])
    .lt("created_at", new Date(Date.now() - 5 * 60_000).toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  const rows = (data as PaymentRow[] | null) ?? [];
  let changed = 0;
  for (const row of rows) {
    const outcome = await syncPayment(row, "poll");
    if (outcome.changed) changed += 1;
  }
  return { checked: rows.length, changed };
}

/**
 * The Multibanco details, by email. A reference is useless on a screen the client is about to
 * close — it has to be somewhere they can find it at the ATM.
 */
export async function announceReference(args: {
  bookingId: string;
  entity: string | null;
  reference: string | null;
  amount: number;
  expiresAt: string | null;
}): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  const { data } = await sb.from("bookings").select("ref, clients(email)").eq("id", args.bookingId).maybeSingle();
  const booking = data as unknown as { ref: string; clients: { email: string } | null } | null;
  if (!booking?.clients?.email || !args.reference) return;

  const facts: [string, string][] = [
    ["Entidade", args.entity ?? "—"],
    ["Referência", args.reference],
    ["Valor", euro(args.amount)],
  ];
  if (args.expiresAt) facts.push(["Pague até", new Date(args.expiresAt).toLocaleDateString("pt-PT", { dateStyle: "long" })]);

  const doc = renderEmail({
    preheader: `Referência para pagar o sinal da reserva ${booking.ref}`,
    heading: "Os dados para pagar o sinal",
    lead: "Pode pagar no homebanking ou numa caixa Multibanco.",
    facts,
    paragraphs: ["A reserva fica confirmada automaticamente assim que o pagamento entrar."],
    cta: { label: "Ver a reserva", href: siteUrl(`/reserva/${args.bookingId}`) },
  });
  await sendEmail({
    to: booking.clients.email,
    subject: `Referência para o sinal · reserva ${booking.ref}`,
    text: doc.text,
    html: doc.html,
  }).catch((err) => console.error("[payments] reference email:", err));
}

// --- Telling people -----------------------------------------------------------
/**
 * The chef accepted and the signal is now due. Without this email a client who closed the tab has
 * no idea anything is waiting for them, and the booking quietly expires unpaid.
 */
export async function announceDepositDue(bookingId: string): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  const { data } = await sb
    .from("bookings")
    .select("ref, date, time_label, deposit_amount, deposit_due_at, deposit_status, chefs(display_name), clients(email, name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return;

  const booking = data as unknown as {
    ref: string;
    date: string;
    time_label: string | null;
    deposit_amount: string | number | null;
    deposit_due_at: string | null;
    deposit_status: string;
    chefs: { display_name: string } | null;
    clients: { email: string; name: string | null } | null;
  };
  if (booking.deposit_status !== "due" || !booking.clients?.email || !Number(booking.deposit_amount)) return;

  const deadline = booking.deposit_due_at ? new Date(booking.deposit_due_at) : null;
  const facts: [string, string][] = [
    ["Reserva", booking.ref],
    ["Quando", `${booking.date}${booking.time_label ? ` · ${booking.time_label}` : ""}`],
    ["Sinal", euro(Number(booking.deposit_amount))],
  ];
  if (deadline) facts.push(["Pague até", deadline.toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" })]);

  const doc = renderEmail({
    preheader: `Falta o sinal da reserva ${booking.ref}`,
    heading: `${booking.chefs?.display_name ?? "O chef"} aceitou o seu pedido`,
    lead: "Falta pagar o sinal para a reserva ficar confirmada.",
    facts,
    paragraphs: [
      "Pode pagar por MB WAY ou por referência Multibanco na página da reserva.",
      "O restante valor do serviço é combinado e pago diretamente ao chef.",
    ],
    cta: { label: "Pagar o sinal", href: siteUrl(`/reserva/${bookingId}`) },
  });
  await sendEmail({ to: booking.clients.email, subject: `Falta o sinal · reserva ${booking.ref}`, text: doc.text, html: doc.html }).catch(
    (err) => console.error("[payments] deposit due email:", err),
  );
}

async function announcePaid(bookingId: string): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  const { data } = await sb
    .from("bookings")
    .select(
      "id, ref, date, time_label, offer_title, deposit_amount, payout_amount, guests, chefs(display_name, profiles(email)), clients(name, email)",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return;

  const booking = data as unknown as {
    ref: string;
    date: string;
    time_label: string | null;
    offer_title: string;
    deposit_amount: string | number | null;
    payout_amount: string | number | null;
    guests: number;
    chefs: { display_name: string; profiles: { email: string | null } | null } | null;
    clients: { name: string | null; email: string } | null;
  };

  const when = `${booking.date}${booking.time_label ? ` · ${booking.time_label}` : ""}`;
  const chefEmail = booking.chefs?.profiles?.email;
  const clientEmail = booking.clients?.email;

  if (clientEmail) {
    const doc = renderEmail({
      preheader: `Reserva ${booking.ref} confirmada`,
      heading: "Sinal recebido, reserva confirmada",
      lead: `${booking.chefs?.display_name ?? "O chef"} já sabe que está tudo confirmado.`,
      facts: [
        ["Reserva", booking.ref],
        ["Quando", when],
        ["Sinal pago", euro(Number(booking.deposit_amount ?? 0))],
      ],
      paragraphs: ["O restante valor do serviço é combinado e pago diretamente ao chef."],
      cta: { label: "Ver a reserva", href: siteUrl(`/reserva/${bookingId}`) },
    });
    await sendEmail({ to: clientEmail, subject: `Reserva ${booking.ref} confirmada`, text: doc.text, html: doc.html }).catch((err) =>
      console.error("[payments] client email:", err),
    );
  }

  if (chefEmail) {
    const doc = renderEmail({
      preheader: `Sinal recebido · ${booking.ref}`,
      heading: "O sinal entrou",
      lead: `A reserva ${booking.ref} está confirmada.`,
      facts: [
        ["Serviço", `${booking.offer_title} · ${booking.guests} pessoas`],
        ["Quando", when],
        ["Vais receber", euro(Number(booking.payout_amount ?? 0))],
      ],
      paragraphs: ["Transferimos este valor depois do serviço concluído, com o documento de pagamento."],
      cta: { label: "Ver o pedido", href: siteUrl(`/dashboard/pedidos/${bookingId}`) },
    });
    await sendEmail({ to: chefEmail, subject: `Sinal recebido · reserva ${booking.ref}`, text: doc.text, html: doc.html }).catch((err) =>
      console.error("[payments] chef email:", err),
    );
  }
}

async function alertAdmin(payment: PaymentRow, detail: string): Promise<void> {
  const { notifyAdmin } = await import("../email");
  await notifyAdmin({
    subject: "Pagamento com valor diferente do esperado",
    preheader: "Um pagamento não bate certo",
    heading: "Valor do pagamento não corresponde",
    lead: "A EuPago diz que foi pago um valor diferente do que pedimos. O pagamento ficou por confirmar.",
    facts: [
      ["Pagamento", payment.id],
      ["Reserva", payment.booking_id],
      ["Detalhe", detail],
    ],
    cta: { label: "Ver em Pagamentos", href: siteUrl("/admin/pagamentos") },
  });
}
