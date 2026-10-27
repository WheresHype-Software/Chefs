import type { ServiceType } from "./types";

/** Cooking categories (mirrors cuisine_categories: seed.sql plus migration 8), in display order. */
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

export const SERVICE_FILTERS: [ServiceFilter, string][] = [
  ["all", "Todos"],
  ["home", "Chef em casa"],
  ["meal_prep", "Marmitas"],
  ["delivery", "Entrega"],
  ["pickup", "Levantamento"],
  ["events", "Eventos"],
];
