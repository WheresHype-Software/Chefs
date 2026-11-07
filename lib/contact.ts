/**
 * Turning a typed phone number into something tappable.
 *
 * People write their number the way they say it: with spaces, with +351, with 00351, sometimes
 * with a dash. A chef standing at a door with the wrong address does not want to copy digits
 * across to the dialler, so this is deliberately forgiving where `normalisePhone` is strict.
 * That one guards a payment and must reject anything it is not sure about; this one only opens an
 * app, and the worst case is a call that does not connect.
 */

const PT_COUNTRY_CODE = "351";

export type ContactPhone = {
  /** Exactly what the client typed, so the chef recognises it. */
  display: string;
  /** For `tel:` — the dialler is happy with the leading plus. */
  tel: string;
  /** For `wa.me` — digits only, country code included, no plus. */
  whatsapp: string;
};

export function contactPhone(value: string | null | undefined): ContactPhone | null {
  const display = (value ?? "").trim();
  if (!display) return null;

  const hasPlus = display.replace(/[\s.()-]/g, "").startsWith("+");
  const digits = display.replace(/\D/g, "");
  // Nine digits is the shortest real number here; below that it is a typo, not a phone.
  if (digits.length < 9) return null;

  let international: string;
  if (hasPlus) international = digits;
  else if (digits.startsWith("00")) international = digits.slice(2);
  // Without any prefix it is a local number, and local means Portugal for everyone using this.
  else if (digits.length === 9) international = `${PT_COUNTRY_CODE}${digits}`;
  else international = digits;

  return { display, tel: `+${international}`, whatsapp: international };
}

/**
 * A WhatsApp link that opens the chat with the message already written.
 *
 * wa.me works on the phone and on the desktop app alike, which the `whatsapp://` scheme does not.
 */
export function whatsappLink(phone: ContactPhone, text?: string): string {
  const base = `https://wa.me/${phone.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
