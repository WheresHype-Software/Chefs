import type { ServiceFilter } from "./constants";

/** What a visitor searched for, as carried in the /procurar URL. */
export type SearchQuery = {
  /** Place name as typed or picked ("Campo de Ourique, Lisboa"). */
  where: string;
  lat: number | null;
  lng: number | null;
  service: ServiceFilter;
  cuisine: string | null;
  /** YYYY-MM-DD */
  date: string | null;
};

const SERVICES = new Set<ServiceFilter>(["all", "home", "delivery", "pickup", "events", "meal_prep"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const one = (v: string | string[] | undefined | null) => (Array.isArray(v) ? v[0] : v) ?? "";

function coordinate(v: string, min: number, max: number): number | null {
  const n = Number(v);
  return v !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function parseSearchQuery(params: Record<string, string | string[] | undefined>): SearchQuery {
  const service = one(params.servico) as ServiceFilter;
  const date = one(params.data);
  return {
    where: one(params.onde).trim().slice(0, 120),
    lat: coordinate(one(params.lat), 36, 43),
    lng: coordinate(one(params.lng), -10, -6),
    service: SERVICES.has(service) ? service : "all",
    cuisine: one(params.cozinha).trim().slice(0, 40) || null,
    date: DATE_RE.test(date) ? date : null,
  };
}

/** Builds a /procurar URL; `changes` override fields of `base`. */
export function searchHref(base: Partial<SearchQuery>, changes: Partial<SearchQuery> = {}): string {
  const q = { ...base, ...changes };
  const params = new URLSearchParams();
  if (q.where) params.set("onde", q.where);
  if (q.lat != null && q.lng != null) {
    params.set("lat", q.lat.toFixed(5));
    params.set("lng", q.lng.toFixed(5));
  }
  if (q.service && q.service !== "all") params.set("servico", q.service);
  if (q.cuisine) params.set("cozinha", q.cuisine);
  if (q.date) params.set("data", q.date);
  const s = params.toString();
  return s ? `/procurar?${s}` : "/procurar";
}
