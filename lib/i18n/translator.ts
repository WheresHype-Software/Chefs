import { createTranslator, type Messages, type NamespaceKeys, type NestedKeyOf } from "next-intl";
import { MESSAGES } from "@/messages";
import { formats } from "./formats";
import type { Locale } from "./routing";

type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

/**
 * A translator outside a request: emails, webhooks, route handlers, background jobs. Pass the
 * recipient's locale (fromDbLocale(profile.locale)), never the visitor's.
 */
export function getTranslator<N extends Namespace>(locale: Locale, namespace: N) {
  return createTranslator({ locale, messages: MESSAGES[locale], namespace, timeZone: "Europe/Lisbon", formats });
}
