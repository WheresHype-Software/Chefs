import type { BookingStatus, FulfilmentMode, Offer, ServiceType } from "./types";

export function euro(n: number | null | undefined): string {
  if (n == null) return "";
  const v = Number(n);
  return (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace(".", ",") + " €";
}

export function rating(r: number | null, count: number): string {
  if (!r || count === 0) return "Novo";
  return `★ ${Number(r).toFixed(1).replace(".", ",")} (${count})`;
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

export const TIER_LABEL: Record<string, string> = {
  professional: "Profissional",
  home: "Chef caseira",
};

export function tierLabel(tier: string, isNew = false, reviewCount = 0, rating: number | null = null): string {
  if (isNew && reviewCount === 0) return "Novo talento";
  if (reviewCount >= 25 && (rating ?? 0) >= 4.7) return "Top chef";
  return TIER_LABEL[tier] ?? tier;
}

export const SERVICE_LABEL: Record<ServiceType, string> = {
  home: "Chef em casa",
  delivery: "Entrega",
  pickup: "Levantamento",
  events: "Eventos",
  meal_prep: "Marmitas",
};

export const MODE_LABEL: Record<FulfilmentMode, string> = {
  home: "Em sua casa",
  delivery: "Entrega",
  pickup: "Levantamento",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Pedido enviado",
  accepted: "Aceite pelo chef",
  change_proposed: "Alteração proposta",
  declined: "Recusado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export function offerPriceLabel(o: Pick<Offer, "priceModel" | "price" | "unit">): string {
  if (o.priceModel === "quote" || o.price == null) return "Sob orçamento";
  return `${euro(o.price)} / ${o.unit}`;
}

export function fromPrice(offers: Offer[]): string {
  const priced = offers.filter((o) => o.price != null && o.priceModel !== "quote");
  if (!priced.length) return "orçamento";
  return euro(Math.min(...priced.map((o) => Number(o.price))));
}

export function unitTitle(o: Pick<Offer, "unit" | "priceModel">): string {
  const u = o.unit.toLowerCase();
  if (u.startsWith("pessoa") || o.priceModel === "quote") return "Pessoas";
  if (u.startsWith("refei")) return "Refeições";
  return "Unidades";
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

export function dayLabel(iso: string): string {
  const d = parseDay(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}.`;
}

export function longDay(iso: string): string {
  const d = parseDay(iso);
  const wd = WEEKDAYS[d.getDay()]!;
  return `${wd[0]!.toUpperCase()}${wd.slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} de ${year}`;
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function shortStamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}., ${timeLabel(iso)}`;
}

const TONES = ["#e4ecf8", "#eef3fa", "#dfe7f4", "#e9eff8", "#f3f6fb", "#e6edf7", "#dce5f3"];

/** Neutral placeholder tone for a chef without photos, stable per id. */
export function toneFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(h) % TONES.length]!;
}
