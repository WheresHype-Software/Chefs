import chefEn from "@/messages/en/chef.json";
import chefPt from "@/messages/pt/chef.json";
import { DEFAULT_LOCALE, type Locale } from "./i18n/routing";

/** Languages a chef can say they speak, stored as codes on chefs.languages. */
export const LANGUAGE_CODES = ["pt", "en", "es", "fr", "it", "de"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

// Names come from messages/<locale>/chef.json (chef.languages), as lib/format does with enums.
const NAMES: Record<Locale, Record<LanguageCode, string>> = { pt: chefPt.languages, en: chefEn.languages };

/** "en" → "Inglês" / "English"; unknown codes are shown as they are. */
export function languageName(code: string, locale: Locale = DEFAULT_LOCALE): string {
  return (NAMES[locale] as Record<string, string>)[code] ?? code;
}

/** ["pt", "en"] → ["Português", "Inglês"] / ["Portuguese", "English"]. */
export const languageNames = (codes: string[], locale: Locale = DEFAULT_LOCALE) => codes.map((c) => languageName(c, locale));

/** [code, name] pairs for a picker, in the given language. */
export const languageOptions = (locale: Locale = DEFAULT_LOCALE): [code: LanguageCode, name: string][] =>
  LANGUAGE_CODES.map((c) => [c, NAMES[locale][c]]);

/** @deprecated Portuguese names only; use languageOptions(locale). Kept for the profile form. */
export const LANGUAGES: [code: string, name: string][] = languageOptions("pt");
