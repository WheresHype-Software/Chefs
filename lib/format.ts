import enumsEn from "@/messages/en/enums.json";
import enumsPt from "@/messages/pt/enums.json";
import { DEFAULT_LOCALE, LOCALE_TAG, type Locale } from "./i18n/routing";
import type { BookingStatus, FulfilmentMode, Offer, ServiceType } from "./types";

// Every formatter takes the locale last and defaults to Portuguese, so emails and admin code that
// predate the translations keep working. Labels come from messages/<locale>/enums.json.
const ENUMS: Record<Locale, typeof enumsPt> = { pt: enumsPt, en: enumsEn };
const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");

/** "40 €" / "12,50 €" in Portuguese, "€40" / "€12.50" in English. */
export function euro(n: number | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (n == null) return "";
  const v = Number(n);
  const num = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return locale === "pt" ? num.replace(".", ",") + " €" : `€${num}`;
}

/** A decimal in the locale's style: 4,9 / 4.9. */
export function decimal(n: number, digits = 1, locale: Locale = DEFAULT_LOCALE): string {
  const s = Number(n).toFixed(digits);
  return locale === "pt" ? s.replace(".", ",") : s;
}

export function rating(r: number | null, count: number, locale: Locale = DEFAULT_LOCALE): string {
  if (!r || count === 0) return ENUMS[locale].rating.new;
  return `★ ${decimal(r, 1, locale)} (${count})`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/** What the chef says they are (profile form); the public title comes from verification instead. */
export const TIER_LABEL: Record<string, string> = enumsPt.tier;
export function tierLabel(tier: string, locale: Locale = DEFAULT_LOCALE): string {
  return (ENUMS[locale].tier as Record<string, string>)[tier] ?? tier;
}

/**
 * "Chef" is earned: only once the team has verified a cooking certificate (the admin-only
 * "certified" badge). Everyone else is "Cozinheiro" or "Cozinheira", as they chose (mirrored
 * into badges as "cozinheira" by the database).
 */
export function isVerifiedChef(badges: readonly string[]): boolean {
  return badges.includes("certified");
}

/** "Chef", "Cozinheiro" / "Cozinheira"; in English "Chef" or "Cook". */
export function chefTitle(badges: readonly string[], locale: Locale = DEFAULT_LOCALE): string {
  const t = ENUMS[locale].title;
  if (isVerifiedChef(badges)) return t.chef;
  return badges.includes("cozinheira") ? t.cookFemale : t.cook;
}

/** "Chef Marta Figueiredo" or "Cozinheiro Rui Barata". */
export function titledName(chef: { name: string; badges: readonly string[] }, locale: Locale = DEFAULT_LOCALE): string {
  return `${chefTitle(chef.badges, locale)} ${chef.name}`;
}

/** "Chef Marta", "Cozinheiro Rui": the first name with the title, for sentences. */
export function titledFirst(chef: { name: string; badges: readonly string[] }, locale: Locale = DEFAULT_LOCALE): string {
  return `${chefTitle(chef.badges, locale)} ${firstName(chef.name)}`;
}

/** Portuguese labels, kept for the admin area (Portuguese only). Elsewhere use serviceLabel() & co. */
export const SERVICE_LABEL: Record<ServiceType, string> = enumsPt.service;
export const MODE_LABEL: Record<FulfilmentMode, string> = enumsPt.mode;
export const STATUS_LABEL: Record<BookingStatus, string> = enumsPt.status;

export function serviceLabel(s: ServiceType, locale: Locale = DEFAULT_LOCALE): string {
  return ENUMS[locale].service[s] ?? s;
}
export function modeLabel(m: FulfilmentMode, locale: Locale = DEFAULT_LOCALE): string {
  return ENUMS[locale].mode[m] ?? m;
}
export function statusLabel(s: BookingStatus, locale: Locale = DEFAULT_LOCALE): string {
  return ENUMS[locale].status[s] ?? s;
}

/**
 * The unit a chef sells by ("pessoa", "pack"…). Chefs pick from the usual Portuguese units or type
 * their own: the usual ones are translated, anything else is shown as written.
 */
export function unitLabel(unit: string, locale: Locale = DEFAULT_LOCALE): string {
  const key = unit.trim().toLowerCase();
  return (ENUMS[locale].unit as Record<string, string>)[key] ?? unit;
}

export function offerPriceLabel(o: Pick<Offer, "priceModel" | "price" | "unit">, locale: Locale = DEFAULT_LOCALE): string {
  const p = ENUMS[locale].price;
  if (o.priceModel === "quote" || o.price == null) return p.quote;
  return fill(p.per, { price: euro(o.price, locale), unit: unitLabel(o.unit, locale) });
}

/** The cheapest priced offer ("40 €"), or null when everything is on request. */
export function minPrice(offers: Offer[], locale: Locale = DEFAULT_LOCALE): string | null {
  const priced = offers.filter((o) => o.price != null && o.priceModel !== "quote");
  if (!priced.length) return null;
  return euro(Math.min(...priced.map((o) => Number(o.price))), locale);
}

/** "40 €" or, when everything is on request, "orçamento" / "quote". */
export function fromPrice(offers: Offer[], locale: Locale = DEFAULT_LOCALE): string {
  return minPrice(offers, locale) ?? ENUMS[locale].price.quoteShort;
}

/** "Desde 40 €" / "From €40", or "Sob orçamento" / "On request". */
export function fromPriceLabel(offers: Offer[], locale: Locale = DEFAULT_LOCALE): string {
  const p = ENUMS[locale].price;
  const min = minPrice(offers, locale);
  return min ? fill(p.from, { price: min }) : p.quote;
}

export function unitTitle(o: Pick<Offer, "unit" | "priceModel">, locale: Locale = DEFAULT_LOCALE): string {
  const t = ENUMS[locale].units;
  const u = o.unit.toLowerCase();
  if (u.startsWith("pessoa") || o.priceModel === "quote") return t.people;
  if (u.startsWith("refei")) return t.meals;
  return t.units;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Parses a YYYY-MM-DD date as a local calendar day. */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const en = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE_TAG.en, o).format(d);

/** "domingo, 15 nov." / "Sunday, 15 Nov". */
export function dayLabel(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const d = parseDay(iso);
  if (locale === "en") return en(d, { weekday: "long", day: "numeric", month: "short" });
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}.`;
}

/** "Domingo, 15 de novembro" / "Sunday, 15 November". */
export function longDay(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const d = parseDay(iso);
  if (locale === "en") return en(d, { weekday: "long", day: "numeric", month: "long" });
  const wd = WEEKDAYS[d.getDay()]!;
  return `${wd[0]!.toUpperCase()}${wd.slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "novembro de 2026" / "November 2026". */
export function monthLabel(year: number, month: number, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "en") return en(new Date(year, month, 1), { month: "long", year: "numeric" });
  return `${MONTHS[month]} de ${year}`;
}

/** Short weekday names from Monday: S T Q Q S S D / M T W T F S S. */
export function weekdayInitials(locale: Locale = DEFAULT_LOCALE): string[] {
  if (locale === "en") return ["M", "T", "W", "T", "F", "S", "S"];
  return ["S", "T", "Q", "Q", "S", "S", "D"];
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Dia, mês, ano e hora. Para o admin, onde se olha para uma lista de coisas que aconteceram em
 * semanas diferentes e a hora é o que distingue duas inscrições da mesma tarde.
 */
export function fullStamp(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const d = new Date(iso);
  if (locale === "en") return `${en(d, { day: "numeric", month: "short", year: "numeric" })}, ${timeLabel(iso)}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}. ${d.getFullYear()}, ${timeLabel(iso)}`;
}

export function shortStamp(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const d = new Date(iso);
  if (locale === "en") return `${en(d, { day: "numeric", month: "short" })}, ${timeLabel(iso)}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}., ${timeLabel(iso)}`;
}

const TONES = ["#e4ecf8", "#eef3fa", "#dfe7f4", "#e9eff8", "#f3f6fb", "#e6edf7", "#dce5f3"];

/** Neutral placeholder tone for a chef without photos, stable per id. */
export function toneFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(h) % TONES.length]!;
}
