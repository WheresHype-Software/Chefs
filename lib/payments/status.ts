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
