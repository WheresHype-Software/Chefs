// TEMPORARY STOCK PHOTOGRAPHY (Unsplash licence, free to use).
// Replace with real photos of Ao Lume chefs and their food before launch.
// Every image goes through <Photo>, which falls back to an azulejo tile if a URL ever fails.

export type StockPhoto = { id: string; alt: string };

const unsplash = (id: string, width: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;

export function photoUrl(photo: StockPhoto, width = 800): string {
  return unsplash(photo.id, width);
}

export function photoSrcSet(photo: StockPhoto, widths = [400, 800, 1200]): string {
  return widths.map((w) => `${unsplash(photo.id, w)} ${w}w`).join(", ");
}

export const PHOTOS = {
  table: { id: "photo-1504674900247-0877df9cc836", alt: "Mesa com vários pratos caseiros servidos para partilhar" },
  cooking: { id: "photo-1556910103-1c02745aae4d", alt: "Mãos a cozinhar numa cozinha de casa" },
  plated: { id: "photo-1414235077428-338989a2e8c0", alt: "Prato empratado por um chef" },
  grill: { id: "photo-1555939594-58d7cb561ad1", alt: "Espetadas a grelhar no carvão" },
  soup: { id: "photo-1547592180-85f173990554", alt: "Taça de sopa caseira" },
  cake: { id: "photo-1565958011703-44f9829ba187", alt: "Bolo caseiro de aniversário" },
  bowl: { id: "photo-1512621776951-a57141f2eefd", alt: "Refeição saudável numa taça" },
  salad: { id: "photo-1546069901-ba9599a7e63c", alt: "Salada fresca da época" },
  spread: { id: "photo-1540189549336-e6e99c3679fe", alt: "Refeição colorida vista de cima" },
} satisfies Record<string, StockPhoto>;

/** A representative photo per service type, for service tiles and empty covers. */
export const SERVICE_PHOTO = {
  home: PHOTOS.plated,
  meal_prep: PHOTOS.bowl,
  delivery: PHOTOS.spread,
  pickup: PHOTOS.cake,
  events: PHOTOS.table,
} as const;
