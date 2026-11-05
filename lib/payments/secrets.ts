import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, readKey } from "../crypto";
import { serverEnv } from "../env.server";

/**
 * Binds the pure crypto helpers to the key in the environment. Kept apart from `lib/crypto.ts` so
 * that module stays free of `server-only` and can be unit-tested.
 */
let cached: Buffer | null = null;

function key(): Buffer {
  if (!cached) cached = readKey(serverEnv.payoutEncryptionKey);
  return cached;
}

/** True when the app can store bank details at all. Checked before offering the form. */
export function canEncrypt(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export const encrypt = (plain: string): string => encryptSecret(plain, key());
export const decrypt = (blob: string): string => decryptSecret(blob, key());

/**
 * A one-time token for a confirmation link: the chef gets the token, the database keeps only its
 * hash, so a leaked database row cannot be turned into a working link.
 */
export function oneTimeToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
