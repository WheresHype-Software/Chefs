"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { bookingTokenCookieName, UUID_RE } from "@/lib/booking-token";
import { isValidIban, normaliseIban, normalisePhone } from "@/lib/fiscal";
import { maskPhone } from "@/lib/crypto";
import { toCents } from "@/lib/money";
import { announceReference } from "@/lib/payments/confirm";
import { eupago } from "@/lib/payments/eupago";
import { canEncrypt, encrypt } from "@/lib/payments/secrets";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { fail, failWith, type ActionResult } from "@/lib/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { DepositStatus, PaymentMethod, PaymentStatus } from "@/lib/types";
import { headers } from "next/headers";

/**
 * Paying the signal, from the client's side.
 *
 * Server actions are public endpoints, so none of these trust their arguments: the amount is never
 * passed in (it is read from the booking), the booking is authorised by the database through the
 * guest's token, and the payment is only created by a function that checks the booking is actually
 * waiting for one.
 */

const BookingId = z.string().regex(UUID_RE);
const Method = z.enum(["mbway", "multibanco"]);

export type PaymentState = {
  bookingStatus: string;
  depositStatus: DepositStatus;
  depositAmount: number | null;
  depositDueAt: string | null;
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    entity: string | null;
    reference: string | null;
    expiresAt: string | null;
    phoneMasked: string | null;
    createdAt: string;
  } | null;
};

const DEMO_STATE: PaymentState = {
  bookingStatus: "accepted",
  depositStatus: "due",
  depositAmount: 99,
  depositDueAt: new Date(Date.now() + 43 * 3600_000).toISOString(),
  payment: null,
};

async function guestToken(bookingId: string): Promise<string | null> {
  return (await cookies()).get(bookingTokenCookieName(bookingId))?.value ?? null;
}

const isDemo = (id: string) => !hasSupabase || id === "demo";

/** Where the signal stands. Safe to poll: it reads our own records, never the provider. */
export async function getPaymentState(id: string): Promise<PaymentState | null> {
  if (isDemo(id)) return DEMO_STATE;
  if (!BookingId.safeParse(id).success) return null;
  const sb = await createClient();
  const { data, error } = await sb.rpc("payment_state", { p_booking: id, p_token: await guestToken(id) });
  if (error || !data) return null;
  return data as PaymentState;
}

export type StartResult = { ok: true; state: PaymentState } | { ok: false; error: string };

/**
 * Opens a payment at the provider and hands the client what they need to pay it: an MB WAY request
 * waiting for their approval, or an entity and reference.
 */
export async function startDepositPayment(id: string, method: PaymentMethod, phone?: string): Promise<StartResult> {
  const parsed = z.object({ id: BookingId, method: Method }).safeParse({ id, method });
  if (isDemo(id)) {
    return {
      ok: true,
      state: {
        ...DEMO_STATE,
        depositStatus: "pending",
        payment: {
          id: "demo-payment",
          method,
          status: "pending",
          amount: 99,
          entity: method === "multibanco" ? "82307" : null,
          reference: method === "multibanco" ? "100 502 152" : null,
          expiresAt: new Date(Date.now() + (method === "mbway" ? 5 * 60_000 : 43 * 3600_000)).toISOString(),
          phoneMasked: method === "mbway" ? maskPhone(phone ?? "912345678") : null,
          createdAt: new Date().toISOString(),
        },
      },
    };
  }
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };

  // One person, one booking: a handful of attempts an hour is generous and stops a loop.
  const limit = rateLimit(`deposit:${id}:${callerIp(await headers())}`, 10, 3600);
  if (!limit.allowed) return { ok: false, error: "Demasiadas tentativas. Aguarde alguns minutos e tente de novo." };

  let normalisedPhone: string | null = null;
  if (method === "mbway") {
    normalisedPhone = normalisePhone(phone ?? "");
    if (!normalisedPhone) return { ok: false, error: "Indique um número de telemóvel português associado ao MB WAY." };
  }

  const sb = await createClient();
  const token = await guestToken(id);
  const { data: paymentId, error } = await sb.rpc("create_deposit_payment", {
    p_booking: id,
    p_method: method,
    p_phone_masked: normalisedPhone ? maskPhone(normalisedPhone) : null,
    p_token: token,
  });
  if (error) {
    const known: Record<string, string> = {
      not_allowed: "Não conseguimos abrir este pedido aqui.",
      booking_not_awaiting_payment: "Esta reserva já não está à espera do sinal. Atualize a página.",
      deposit_not_due: "Esta reserva já não está à espera do sinal. Atualize a página.",
      nothing_to_pay: "Esta reserva não tem sinal a pagar.",
    };
    const key = Object.keys(known).find((k) => error.message.includes(k));
    return { ok: false, error: key ? known[key]! : "Não foi possível iniciar o pagamento. Tente de novo." };
  }

  // From here the provider is involved, which needs to bypass RLS: the guest has no session.
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Os pagamentos ainda não estão disponíveis. Tente mais tarde." };

  const { data: payment } = await admin
    .from("payments")
    .select("id, amount, booking_id, bookings(ref, deposit_due_at, clients(email, name))")
    .eq("id", paymentId as string)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Não foi possível iniciar o pagamento. Tente de novo." };

  const row = payment as unknown as {
    id: string;
    amount: string | number;
    bookings: { ref: string; deposit_due_at: string | null; clients: { email: string; name: string | null } | null } | null;
  };
  const amountCents = toCents(row.amount);
  const client = row.bookings?.clients ?? null;
  // The identifier comes back to us on the webhook, so make it the one thing we need: our own id.
  const identifier = row.id;

  const created =
    method === "mbway"
      ? await eupago.createMbway({ identifier, amountCents, phone: normalisedPhone!, email: client?.email, name: client?.name })
      : await eupago.createMultibanco({
          identifier,
          amountCents,
          expiresOn: (row.bookings?.deposit_due_at ?? new Date(Date.now() + 3 * 86400_000).toISOString()).slice(0, 10),
          email: client?.email,
        });

  if (!created.ok) {
    // Only the server may decide a payment failed, so this goes through the secret-key client.
    await admin.rpc("mark_payment_unpaid", { p_payment: row.id, p_status: "failed" });
    return { ok: false, error: created.error };
  }

  const { error: updateError } = await admin
    .from("payments")
    .update({
      status: "pending",
      provider_reference: created.data.providerReference,
      provider_transaction_id: created.data.providerTransactionId,
      mb_entity: created.data.entity,
      mb_reference: method === "multibanco" ? created.data.providerReference : null,
      mb_expires_at: method === "multibanco" ? created.data.expiresAt : null,
      expires_at: created.data.expiresAt,
    })
    .eq("id", row.id);
  if (updateError) return failWith(updateError, "startDepositPayment update", "Não foi possível iniciar o pagamento.") as StartResult;

  if (method === "multibanco") {
    await announceReference({
      bookingId: id,
      entity: created.data.entity,
      reference: created.data.providerReference,
      amount: Number(row.amount),
      expiresAt: created.data.expiresAt,
    }).catch((err) => console.error("[deposit] reference email:", err));
  }

  revalidatePath(`/reserva/${id}`);
  const state = await getPaymentState(id);
  return state ? { ok: true, state } : { ok: false, error: "Não foi possível iniciar o pagamento. Tente de novo." };
}

/** Gives up on the current attempt so the client can choose another way to pay. */
export async function cancelDepositPayment(id: string): Promise<ActionResult> {
  if (isDemo(id)) return { ok: true };
  if (!BookingId.safeParse(id).success) return fail("Pedido inválido.");
  // getPaymentState is the authorisation: it only answers for a booking this caller can open.
  const state = await getPaymentState(id);
  if (!state?.payment) return { ok: true };
  if (state.payment.status === "paid") return fail("Este pagamento já foi feito.");
  const admin = createAdminClient();
  if (!admin) return fail("Não foi possível cancelar. Atualize a página.");
  const { error } = await admin.rpc("mark_payment_unpaid", { p_payment: state.payment.id, p_status: "failed" });
  revalidatePath(`/reserva/${id}`);
  return error ? failWith(error, "cancelDepositPayment", "Não foi possível cancelar. Atualize a página.") : { ok: true };
}

export type PendingRefund = { id: string; amount: number; reason: string };

/**
 * A refund that cannot be pushed back the way it came (a Multibanco reference) and is waiting for
 * the client's account. Asked for here, on the booking they already hold a token for, rather than
 * by email — so "we never ask for your IBAN by email" stays true and checkable.
 */
export async function getRefundAwaitingIban(id: string): Promise<PendingRefund | null> {
  if (isDemo(id)) return null;
  if (!BookingId.safeParse(id).success) return null;
  const sb = await createClient();
  const { data, error } = await sb.rpc("refund_awaiting_iban", { p_booking: id, p_token: await guestToken(id) });
  if (error || !data) return null;
  const refund = data as { id: string; amount: string | number; reason: string };
  return { id: refund.id, amount: Number(refund.amount), reason: refund.reason };
}

const RefundIbanInput = z.object({
  refundId: z.string().uuid(),
  iban: z.string().trim().min(15).max(42),
  holder: z.string().trim().min(3).max(160),
});

/** The client's account, encrypted before it is stored and erased once the transfer is made. */
export async function submitRefundIban(id: string, input: z.infer<typeof RefundIbanInput>): Promise<ActionResult> {
  if (isDemo(id)) return { ok: true };
  const parsed = RefundIbanInput.safeParse(input);
  if (!BookingId.safeParse(id).success || !parsed.success) return fail("Dados inválidos.");

  const iban = normaliseIban(parsed.data.iban);
  if (!isValidIban(iban)) return fail("Esse IBAN não é válido. Confirme os dígitos com o seu banco.");
  if (!canEncrypt()) return fail("Não conseguimos registar os dados agora. Tente mais tarde.");

  const sb = await createClient();
  const { error } = await sb.rpc("submit_refund_iban", {
    p_refund: parsed.data.refundId,
    p_booking: id,
    p_encrypted: encrypt(iban),
    p_last4: iban.slice(-4),
    p_holder: parsed.data.holder,
    p_token: await guestToken(id),
  });
  if (error) {
    if (error.message.includes("not_waiting_for_iban")) return fail("Esta devolução já está a ser tratada.");
    return failWith(error, "submitRefundIban", "Não foi possível guardar os dados. Tente de novo.");
  }
  revalidatePath(`/reserva/${id}`);
  return { ok: true };
}
