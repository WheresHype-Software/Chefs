import { createHash } from "node:crypto";
import { contactPhone } from "./contact";

// Customer details for the Meta Conversions API, normalised the way Meta asks and hashed
// (SHA-256): the plain email or phone never leaves the server.

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Trimmed, lowercase email, hashed; null when there is none. */
export function hashedEmail(email: string | null | undefined): string | null {
  const v = (email ?? "").trim().toLowerCase();
  return v ? sha256(v) : null;
}

/** Digits with the country code (Portugal when none is given), hashed; null when not a phone. */
export function hashedPhone(phone: string | null | undefined): string | null {
  const digits = contactPhone(phone)?.whatsapp;
  return digits ? sha256(digits) : null;
}
