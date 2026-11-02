import { distanceKm, type LatLng } from "./geo";

export type City = { slug: string; name: string; lat: number; lng: number };

/**
 * Cities with their own page (/chefs/<slug>): where people search "chef privado em …". The point
 * is the city centre; a chef appears when it sits inside their service radius.
 */
export const CITIES: City[] = [
  { slug: "lisboa", name: "Lisboa", lat: 38.7223, lng: -9.1393 },
  { slug: "porto", name: "Porto", lat: 41.1579, lng: -8.6291 },
  { slug: "cascais", name: "Cascais", lat: 38.6979, lng: -9.4215 },
  { slug: "sintra", name: "Sintra", lat: 38.8029, lng: -9.3817 },
  { slug: "oeiras", name: "Oeiras", lat: 38.697, lng: -9.3017 },
  { slug: "almada", name: "Almada", lat: 38.679, lng: -9.1569 },
  { slug: "loures", name: "Loures", lat: 38.8309, lng: -9.1685 },
  { slug: "vila-franca-de-xira", name: "Vila Franca de Xira", lat: 38.9553, lng: -8.9897 },
  { slug: "setubal", name: "Setúbal", lat: 38.5244, lng: -8.8882 },
  { slug: "comporta", name: "Comporta", lat: 38.3797, lng: -8.7856 },
  { slug: "vila-nova-de-gaia", name: "Vila Nova de Gaia", lat: 41.1239, lng: -8.6118 },
  { slug: "matosinhos", name: "Matosinhos", lat: 41.1844, lng: -8.6963 },
  { slug: "braga", name: "Braga", lat: 41.5454, lng: -8.4265 },
  { slug: "aveiro", name: "Aveiro", lat: 40.6405, lng: -8.6538 },
  { slug: "coimbra", name: "Coimbra", lat: 40.2033, lng: -8.4103 },
  { slug: "leiria", name: "Leiria", lat: 39.7436, lng: -8.8071 },
  { slug: "evora", name: "Évora", lat: 38.5714, lng: -7.9135 },
  { slug: "faro", name: "Faro", lat: 37.0194, lng: -7.9322 },
  { slug: "lagos", name: "Lagos", lat: 37.1028, lng: -8.673 },
];

export const cityBySlug = (slug: string) => CITIES.find((c) => c.slug === slug) ?? null;

/** The closest city with a page, if it's within `maxKm` (used for a chef's breadcrumb). */
export function nearestCity(point: LatLng, maxKm = 30): City | null {
  let best: { city: City; km: number } | null = null;
  for (const city of CITIES) {
    const km = distanceKm(point, city);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= maxKm ? best.city : null;
}
