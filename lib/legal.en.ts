import { LEGAL_UPDATED } from "./legal";

/*
 * Helpers for the English courtesy translations of the legal texts. The Portuguese texts are the
 * binding ones, and their versions are written as Portuguese dates ("10 de novembro de 2026"):
 * the English pages derive their dates from those, so the two can never drift apart.
 */

const MONTHS: Record<string, string> = {
  janeiro: "January",
  fevereiro: "February",
  "março": "March",
  abril: "April",
  maio: "May",
  junho: "June",
  julho: "July",
  agosto: "August",
  setembro: "September",
  outubro: "October",
  novembro: "November",
  dezembro: "December",
};

/** "10 de novembro de 2026" → "10 November 2026". Anything else comes back unchanged. */
export function englishLegalDate(pt: string): string {
  const m = /^(\d{1,2}) de (\p{L}+) de (\d{4})$/u.exec(pt.trim());
  const month = m && MONTHS[m[2]!.toLowerCase()];
  return m && month ? `${m[1]} ${month} ${m[3]}` : pt;
}

/** LEGAL_UPDATED (privacy policy), in English. */
export const LEGAL_UPDATED_EN = englishLegalDate(LEGAL_UPDATED);
