import "server-only";
import { revalidatePath } from "next/cache";
import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getTranslator } from "./translator";
import { localizePath, LOCALES, type Locale } from "./routing";

/**
 * redirect() that keeps the visitor in their language: redirectLocalized("/dashboard") goes to
 * /dashboard in Portuguese and /en/dashboard in English. Works in pages, layouts and actions.
 */
export async function redirectLocalized(path: string): Promise<never> {
  const locale = (await getLocale()) as Locale;
  nextRedirect(localizePath(path, locale));
}

/**
 * Pages live under app/[locale], so "/reserva/x" is cached as /pt/reserva/x and /en/reserva/x.
 * Revalidate the path in every language (and the bare path, harmless when it is not a route).
 */
export function revalidateLocalized(path: string, type?: "layout" | "page"): void {
  for (const l of LOCALES) revalidatePath(`/${l}${path === "/" ? "" : path}` || "/", type);
  revalidatePath(path, type);
}

/** Translator for the current request (pages, layouts, server actions). */
export async function requestTranslator<N extends Parameters<typeof getTranslator>[1]>(namespace: N) {
  return getTranslator((await getLocale()) as Locale, namespace);
}
