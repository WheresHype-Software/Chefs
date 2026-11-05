/**
 * Portuguese fiscal and bank identifiers, checked properly.
 *
 * A typed NIF or IBAN that merely "looks right" is worse than no validation: the payment leaves,
 * the bank bounces it days later, and nobody knows whose money is where. Both numbers carry their
 * own check digits, so a typo is caught here, before anything is stored.
 */

/** Digits only, uppercase, no spaces. */
function clean(value: string): string {
  return value.replace(/[\s.-]/g, "").toUpperCase();
}

/**
 * NIF / NIPC: nine digits whose last one is a modulo-11 check digit.
 * First digit (or first two) says what kind of taxpayer it is; the accepted set follows the AT's
 * own list, which is why 4, 7 and 9 only work with certain second digits.
 */
export function isValidNif(value: string): boolean {
  const nif = clean(value);
  if (!/^\d{9}$/.test(nif)) return false;

  const first = nif[0]!;
  const two = nif.slice(0, 2);
  const singleOk = ["1", "2", "3", "5", "6", "8"].includes(first);
  const pairOk = ["45", "70", "71", "72", "74", "75", "77", "78", "79", "90", "91", "98", "99"].includes(two);
  if (!singleOk && !pairOk) return false;

  let sum = 0;
  for (let i = 0; i < 8; i += 1) sum += Number(nif[i]) * (9 - i);
  const rest = sum % 11;
  const check = rest < 2 ? 0 : 11 - rest;
  return check === Number(nif[8]);
}

/** IBAN check digits, the ISO 13616 way: move the first four characters to the end, mod 97 = 1. */
export function isValidIban(value: string): boolean {
  const iban = clean(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  // The number is far beyond Number.MAX_SAFE_INTEGER, so take the modulo as we go.
  let remainder = 0;
  for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  return remainder === 1;
}

/** A Portuguese IBAN is always PT50 plus 21 digits. Foreign ones are allowed but flagged. */
export function isPortugueseIban(value: string): boolean {
  const iban = clean(value);
  return iban.startsWith("PT") && iban.length === 25 && isValidIban(iban);
}

/** Stored without spaces; shown in groups of four, the way a bank prints it. */
export function normaliseIban(value: string): string {
  return clean(value);
}

export function formatIban(value: string): string {
  return clean(value)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function ibanLast4(value: string): string {
  return clean(value).slice(-4);
}

/** Portuguese postal code: 0000-000. */
export function isValidPostalCode(value: string): boolean {
  return /^\d{4}-\d{3}$/.test(value.trim());
}

/**
 * A Portuguese mobile number for MB WAY: 9 digits starting 91/92/93/96, with or without +351.
 * Returns it in the form EuPago wants, or null.
 */
export function normalisePhone(value: string): string | null {
  const digits = value.replace(/[\s.()-]/g, "").replace(/^\+/, "");
  const local = digits.startsWith("351") ? digits.slice(3) : digits;
  return /^9[1236]\d{7}$/.test(local) ? local : null;
}
