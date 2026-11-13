import { defineRouting } from "next-intl/routing";

/**
 * Portuguese is the site's own language and keeps its URLs as they always were (/para-chefs);
 * English lives under /en (/en/para-chefs). No redirects by browser language: many people in
 * Portugal browse in English, and ads and links in Portuguese must land in Portuguese. People
 * switch with the PT/EN control instead, and no locale cookie is set (nothing to consent to).
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];

export const LOCALES = routing.locales;
export const DEFAULT_LOCALE: Locale = routing.defaultLocale;

/** BCP 47 tags for <html lang>, Intl formatting, Open Graph and hreflang. */
export const LOCALE_TAG: Record<Locale, string> = { pt: "pt-PT", en: "en-GB" };
export const OG_LOCALE: Record<Locale, string> = { pt: "pt_PT", en: "en_GB" };
/** The name of each language in itself, for the switcher. */
export const LOCALE_NAME: Record<Locale, string> = { pt: "Português", en: "English" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/**
 * Locales as stored in the database (profiles.locale, clients.locale: "pt-PT", "en") to the
 * site's locale. Anything unknown is Portuguese.
 */
export function fromDbLocale(v: string | null | undefined): Locale {
  const base = (v ?? "").toLowerCase().slice(0, 2);
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

export function toDbLocale(l: Locale): string {
  return LOCALE_TAG[l];
}

/** "/para-chefs" in a locale: unchanged for Portuguese, "/en/para-chefs" for English. */
export function localizePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The other way round: "/en/para-chefs" → { locale: "en", path: "/para-chefs" }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) return { locale: m[1], path: pathname.slice(3) || "/" };
  return { locale: DEFAULT_LOCALE, path: pathname };
}
