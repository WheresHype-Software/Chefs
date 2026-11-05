/**
 * Application-level encryption for the few fields that must never be readable from a database
 * dump alone: a chef's IBAN, a client's IBAN given for a manual refund.
 *
 * AES-256-GCM, key held only in the environment (PAYOUT_ENCRYPTION_KEY). Postgres never sees the
 * key, so a stolen backup is useless on its own. These functions are pure — the key is passed in,
 * which keeps them testable and keeps `server-only` out of the module graph.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12; // 96-bit nonce, the size GCM is defined for

/** Reads a 32-byte key given as base64 (44 chars) or hex (64 chars). Throws if it is not usable. */
export function readKey(raw: string | undefined): Buffer {
  if (!raw) throw new Error("PAYOUT_ENCRYPTION_KEY is not set");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("PAYOUT_ENCRYPTION_KEY must be 32 bytes (base64 or hex)");
  return key;
}

/** `v1.<iv>.<tag>.<ciphertext>`, all base64. Encrypting the same value twice gives different text. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

/** Throws if the text was tampered with or the key is wrong — GCM authenticates, it does not guess. */
export function decryptSecret(blob: string, key: Buffer): string {
  const [version, iv, tag, ciphertext] = blob.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("unreadable ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** Hex SHA-256. Used to fingerprint the contract text and every payment document we issue. */
export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Compares two hex/base64 signatures without leaking where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** `PT50 0002 … 1234` → `••••1234`. The only form of an IBAN that reaches a screen or an email. */
export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "");
  return clean.length < 4 ? "••••" : `••••${clean.slice(-4)}`;
}

/** `+351912345678` → `•••••••678`. Phone numbers in logs and admin lists. */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/\s+/g, "");
  return clean.length < 3 ? "•••" : `${"•".repeat(Math.max(3, clean.length - 3))}${clean.slice(-3)}`;
}
