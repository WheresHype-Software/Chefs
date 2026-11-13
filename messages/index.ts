import type { Locale } from "@/lib/i18n/routing";
import en from "./en";
import pt from "./pt";

/**
 * Portuguese is the source: every key exists there first and its shape is the type of all
 * messages (see global.d.ts). English must have exactly the same keys (`npm run check:i18n`).
 */
export type AppMessages = typeof pt;

export const MESSAGES: Record<Locale, AppMessages> = { pt, en };

export async function loadMessages(locale: Locale): Promise<AppMessages> {
  return MESSAGES[locale];
}

/** Namespaces only used on the server (emails, legal texts): kept out of the browser bundle. */
export const SERVER_ONLY_NAMESPACES = ["emails", "legal"] as const satisfies readonly (keyof AppMessages)[];

export function clientMessages(locale: Locale): Omit<AppMessages, (typeof SERVER_ONLY_NAMESPACES)[number]> {
  const all: Partial<AppMessages> = { ...MESSAGES[locale] };
  for (const ns of SERVER_ONLY_NAMESPACES) delete all[ns];
  return all as Omit<AppMessages, (typeof SERVER_ONLY_NAMESPACES)[number]>;
}
