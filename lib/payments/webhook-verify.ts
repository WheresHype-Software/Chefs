import { createDecipheriv, createHmac } from "node:crypto";
import { safeEqual } from "../crypto";

/**
 * Checking that a payment notification really came from EuPago.
 *
 * Realtime Webhooks 2.0 sign the body with HMAC-SHA256 in an `X-Signature` header, and can also
 * encrypt it with AES-256-CBC using the IV from `X-Initialization-Vector`. The older webhooks are
 * a plain GET with the data in the query string and no signature at all — which is exactly why
 * nothing in this app decides anything from a notification. A valid signature buys one thing: we
 * skip bothering the team about it. The payment state still comes from asking EuPago directly.
 *
 * The header's encoding is not documented, so both base64 and hex are accepted, and the signature
 * is checked against the `data` field and against the whole body: a false negative here would
 * send a real payment to the alert queue, and a false positive buys an attacker nothing.
 */

/** Accepts a key as hex (64 chars), base64 (44 chars) or 32 raw characters. */
export function readWebhookKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  const utf8 = Buffer.from(raw, "utf8");
  return utf8.length === 32 ? utf8 : null;
}

export function signPayload(payload: string, secret: string): { base64: string; hex: string } {
  const mac = createHmac("sha256", secret).update(payload, "utf8").digest();
  return { base64: mac.toString("base64"), hex: mac.toString("hex") };
}

/** True when `signature` is a valid HMAC of any of the candidate payloads. */
export function verifySignature(candidates: (string | null | undefined)[], signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  const given = signature.trim();
  for (const payload of candidates) {
    if (typeof payload !== "string" || !payload) continue;
    const { base64, hex } = signPayload(payload, secret);
    if (safeEqual(given, base64) || safeEqual(given.toLowerCase(), hex)) return true;
  }
  return false;
}

/** Decrypts an encrypted `data` field. Returns null rather than throwing on anything unexpected. */
export function decryptWebhookData(data: string, iv: string | null, rawKey: string | undefined): string | null {
  const key = readWebhookKey(rawKey);
  if (!key || !iv) return null;
  try {
    const ivBuffer = /^[0-9a-fA-F]{32}$/.test(iv) ? Buffer.from(iv, "hex") : Buffer.from(iv, "base64");
    const decipher = createDecipheriv("aes-256-cbc", key, ivBuffer);
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export type NotificationFacts = {
  /** Our own identifier, sent when the payment was created. */
  identifier: string | null;
  reference: string | null;
  entity: string | null;
  transactionId: string | null;
  amountCents: number | null;
  statusWord: string | null;
};

const text = (v: unknown): string | null => (v == null || v === "" ? null : String(v));

/**
 * Pulls the few facts we need out of either webhook generation, without caring which it was.
 * Everything here is treated as a hint for *which* payment to look up — never as its state.
 */
export function readNotification(body: Record<string, unknown>): NotificationFacts {
  const tx = (body.transactions ?? body.transaction ?? body) as Record<string, unknown>;
  const amount = Number(tx.amount ?? tx.valor ?? body.valor);
  return {
    identifier: text(tx.identifier ?? tx.identificador ?? body.identificador),
    reference: text(tx.reference ?? tx.referencia ?? body.referencia),
    entity: text(tx.entity ?? tx.entidade ?? body.entidade),
    transactionId: text(tx.transactionID ?? tx.trid ?? tx.transacao ?? body.transacao),
    amountCents: Number.isFinite(amount) ? Math.round(amount * 100) : null,
    statusWord: text(tx.status ?? tx.estado ?? body.estado),
  };
}
