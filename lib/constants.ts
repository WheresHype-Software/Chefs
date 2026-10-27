import type { ServiceType } from "./types";

/** Cooking categories offered at launch (mirrors cuisine_categories in seed.sql). */
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
] as const;

export const DIETS = ["Vegetariano", "Vegan", "Sem glúten", "Sem lactose", "Halal", "Para crianças"] as const;

/** A chef can pick up to this many cooking categories (also enforced in the database). */
export const MAX_CATEGORIES = 3;

export type ServiceFilter = ServiceType | "all";

export const SERVICE_FILTERS: [ServiceFilter, string][] = [
  ["all", "Todos"],
  ["home", "Chef em casa"],
  ["meal_prep", "Marmitas"],
  ["delivery", "Entrega"],
  ["pickup", "Levantamento"],
  ["events", "Eventos"],
];
