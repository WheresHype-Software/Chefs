import type { ServiceType } from "./types";

/** Cooking categories (mirrors cuisine_categories: seed.sql plus migration 8), in display order. */
/** The site's public address, as shown to people (links in copy, footer). URLs use NEXT_PUBLIC_SITE_URL. */
export const SITE_DOMAIN = "aolume.com";

export const CUISINES = [
  "Portuguesa",
  "Petiscos",
  "Marisco e peixe",
  "Grelhados",
  "Cozinha de autor",
  "Mediterrânica",
  "Vegetariana",
  "Vegan",
  "Saudável",
  "Pastelaria",
  "Brasileira",
  "Asiática",
  "Japonesa",
  "Sushi",
  "Indiana",
  "Goesa",
  "Italiana",
  "Chinesa",
  "Tailandesa",
  "Vietnamita",
  "Coreana",
  "Mexicana",
  "Peruana",
  "Francesa",
  "Espanhola",
  "Grega",
  "Médio Oriente",
  "Marroquina",
  "Africana",
  "Cabo-verdiana",
  "Angolana",
  "Moçambicana",
  "Americana",
  "Fusão",
  "Churrasco",
] as const;

export type Cuisine = (typeof CUISINES)[number];

/**
 * Cuisines are stored (and searched, ?cozinha=) by their Portuguese name; this is the message key
 * under search.cuisines that shows them in the visitor's language.
 */
export const CUISINE_KEY = {
  Portuguesa: "portuguese",
  Petiscos: "petiscos",
  "Marisco e peixe": "seafood",
  Grelhados: "grills",
  "Cozinha de autor": "signature",
  Mediterrânica: "mediterranean",
  Vegetariana: "vegetarian",
  Vegan: "vegan",
  Saudável: "healthy",
  Pastelaria: "pastry",
  Brasileira: "brazilian",
  Asiática: "asian",
  Japonesa: "japanese",
  Sushi: "sushi",
  Indiana: "indian",
  Goesa: "goan",
  Italiana: "italian",
  Chinesa: "chinese",
  Tailandesa: "thai",
  Vietnamita: "vietnamese",
  Coreana: "korean",
  Mexicana: "mexican",
  Peruana: "peruvian",
  Francesa: "french",
  Espanhola: "spanish",
  Grega: "greek",
  "Médio Oriente": "middleEastern",
  Marroquina: "moroccan",
  Africana: "african",
  "Cabo-verdiana": "capeVerdean",
  Angolana: "angolan",
  Moçambicana: "mozambican",
  Americana: "american",
  Fusão: "fusion",
  Churrasco: "barbecue",
} as const satisfies Record<Cuisine, string>;

export type CuisineKey = (typeof CUISINE_KEY)[Cuisine];

/** The message key for a stored cuisine name, or null for one we don't know (shown as written). */
export function cuisineKey(name: string): CuisineKey | null {
  return (CUISINE_KEY as Record<string, CuisineKey>)[name] ?? null;
}

/** A stored cuisine name for display, with a translator for search.cuisines: cuisineLabel((k) => t(k), "Portuguesa"). */
export function cuisineLabel(translate: (key: CuisineKey) => string, name: string): string {
  const key = cuisineKey(name);
  return key ? translate(key) : name;
}

/** Shown as chips in search; the rest sit under "Mais cozinhas". */
export const POPULAR_CUISINES: readonly string[] = [
  "Portuguesa",
  "Petiscos",
  "Japonesa",
  "Italiana",
  "Indiana",
  "Brasileira",
  "Pastelaria",
];

export const DIETS = ["Vegetariano", "Vegan", "Sem glúten", "Sem lactose", "Halal", "Para crianças"] as const;

/** A chef can pick up to this many cooking categories (also enforced in the database). */
export const MAX_CATEGORIES = 5;

export type ServiceFilter = ServiceType | "all";

/** Search filters, in display order. Labels: search.filters.all, then serviceLabel() from lib/format. */
export const SERVICE_FILTERS: ServiceFilter[] = ["all", "home", "meal_prep", "delivery", "pickup", "events"];

/** Trust badges the team can give a chef on approval (mirrors the chefs.badges values). */
export const BADGES = ["identity", "portfolio", "certified", "founder"] as const;
export type Badge = (typeof BADGES)[number];

/** Portuguese labels for the admin; the public profile uses the chef.badges messages. */
export const BADGE_LABEL: Record<Badge, string> = {
  identity: "Identidade verificada",
  portfolio: "Portefólio verificado",
  certified: "Certificado",
  founder: "Fundador",
};
