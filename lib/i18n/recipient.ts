import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_LOCALE, fromDbLocale, type Locale } from "./routing";

/**
 * The language of whoever an email goes to — never the visitor's, unless the visitor is the
 * recipient. Accounts keep it in profiles.locale; guests in clients.locale (the language of their
 * last request). Anything that goes wrong means Portuguese: a lookup must never stop an email.
 *
 * Where a query already fetches the recipient, select `locale` (and `profiles(locale)` for a
 * client) there and use the *From helpers instead of a second query.
 */

type LocaleCol = { locale?: string | null } | null | undefined;

/** A profile row (or an embedded `profiles(locale)`). */
export function profileLocaleFrom(row: LocaleCol): Locale {
  return fromDbLocale(row?.locale);
}

/** A client row selected as `clients(locale, profiles(locale))`: the account's language if registered. */
export function clientLocaleFrom(row: (LocaleCol & { profiles?: LocaleCol }) | null | undefined): Locale {
  if (row?.profiles?.locale) return fromDbLocale(row.profiles.locale);
  return fromDbLocale(row?.locale);
}

export async function localeOfProfile(profileId: string | null | undefined): Promise<Locale> {
  if (!profileId) return DEFAULT_LOCALE;
  try {
    const sb = createAdminClient();
    if (!sb) return DEFAULT_LOCALE;
    const { data } = await sb.from("profiles").select("locale").eq("id", profileId).maybeSingle();
    return profileLocaleFrom(data as LocaleCol);
  } catch (err) {
    console.error("[locale] profile:", err);
    return DEFAULT_LOCALE;
  }
}

/** Several accounts at once (background jobs), as a lookup that defaults to Portuguese. */
export async function localesOfProfiles(profileIds: string[]): Promise<(id: string) => Locale> {
  const found = new Map<string, Locale>();
  try {
    const sb = createAdminClient();
    if (sb && profileIds.length) {
      const { data } = await sb.from("profiles").select("id, locale").in("id", [...new Set(profileIds)]);
      for (const r of (data ?? []) as { id: string; locale: string | null }[]) found.set(r.id, fromDbLocale(r.locale));
    }
  } catch (err) {
    console.error("[locale] profiles:", err);
  }
  return (id) => found.get(id) ?? DEFAULT_LOCALE;
}

export async function localeOfChef(chefId: string | null | undefined): Promise<Locale> {
  if (!chefId) return DEFAULT_LOCALE;
  try {
    const sb = createAdminClient();
    if (!sb) return DEFAULT_LOCALE;
    const { data } = await sb.from("chefs").select("profiles(locale)").eq("id", chefId).maybeSingle();
    return profileLocaleFrom((data as { profiles?: LocaleCol } | null)?.profiles);
  } catch (err) {
    console.error("[locale] chef:", err);
    return DEFAULT_LOCALE;
  }
}

/** By client id or by email address (case-insensitive). */
export async function localeOfClient(clientIdOrEmail: string | null | undefined): Promise<Locale> {
  if (!clientIdOrEmail) return DEFAULT_LOCALE;
  try {
    const sb = createAdminClient();
    if (!sb) return DEFAULT_LOCALE;
    const query = sb.from("clients").select("locale, profiles(locale)").limit(1);
    const { data } = await (clientIdOrEmail.includes("@")
      ? query.ilike("email", escapeLike(clientIdOrEmail))
      : query.eq("id", clientIdOrEmail)
    ).maybeSingle();
    return clientLocaleFrom(data as (LocaleCol & { profiles?: LocaleCol }) | null);
  } catch (err) {
    console.error("[locale] client:", err);
    return DEFAULT_LOCALE;
  }
}

/** An email address as an exact, case-insensitive ILIKE pattern ("_" and "%" are wildcards). */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
