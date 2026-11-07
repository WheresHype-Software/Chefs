import type { ProviderPaymentStatus } from "./types";

/**
 * Reading a provider's word for "paid".
 *
 * Kept apart from the provider client, and pure, because this is the single most dangerous
 * translation in the system: a word we misread as settled releases a booking and, later, money.
 * The rule is one-way — anything not explicitly recognised comes back as "unknown", which the
 * rest of the app treats as "not paid".
 */

const PAID = new Set(["paga", "pago", "paid", "pagamento efetuado", "success", "sucesso"]);
const FAILED = new Set(["anulada", "anulado", "cancelada", "cancelado", "failed", "error", "rejected", "recusado"]);
const EXPIRED = new Set(["expirada", "expirado", "expired", "caducada"]);
const REFUNDED = new Set(["reembolsada", "reembolsado", "refunded", "devolvida", "devolvido"]);
const PENDING = new Set(["created", "ativa", "activa", "active", "aguarda pagamento"]);

/** Lowercase, trimmed, accents removed: "Paga", "paga" and "PAGA" are the same word. */
export function normaliseWord(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function readStatus(value: unknown): ProviderPaymentStatus {
  const s = normaliseWord(value);
  if (!s) return "unknown";
  if (PAID.has(s)) return "paid";
  if (REFUNDED.has(s)) return "refunded";
  if (EXPIRED.has(s)) return "expired";
  if (FAILED.has(s)) return "failed";
  if (PENDING.has(s) || s.startsWith("pend")) return "pending";
  return "unknown";
}

/**
 * What a reference lookup actually means.
 *
 * Lives here, with the tests, because this is where the provider's shape meets ours and it is the
 * easiest place in the system to be quietly wrong: the real response has `estado: 0` (a response
 * code, not a state), the amount nested inside the payments it received, and nulls in fields that
 * a careless schema would mark merely optional. Every one of those has already cost a paid
 * booking that the app believed was unpaid.
 */
export type InfoReading = { status: ProviderPaymentStatus; amountCents: number | null; transactionId: string | null };

const money = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

export function readInfoResponse(body: unknown): InfoReading | null {
  if (!body || typeof body !== "object") return null;
  const info = body as Record<string, unknown>;

  // A negative code is the provider refusing the question, not a payment that went unpaid.
  if (typeof info.estado === "number" && info.estado < 0) return null;

  const payments = Array.isArray(info.pagamentos) ? (info.pagamentos as Record<string, unknown>[]) : [];
  const settled = payments.filter((p) => readStatus(p.estado) === "paid");
  const paidCents = settled.reduce((sum, p) => sum + (money(p.valor) ?? 0), 0);

  return {
    // The reference's own state first, then any payment recorded against it. Never `estado`.
    status: readStatus(info.estado_referencia ?? payments[0]?.estado),
    amountCents: settled.length ? paidCents : money(info.valor),
    transactionId: payments[0]?.trid == null ? null : String(payments[0].trid),
  };
}
