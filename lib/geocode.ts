// Free geocoding via Photon (OpenStreetMap data, no key), biased to Portugal. Works on server and client.

export type Place = { label: string; lat: number; lng: number };

type Feature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

function toPlace(f: Feature): Place {
  const p = f.properties;
  const street = [p.street ?? p.name, p.housenumber].filter(Boolean).join(" ");
  const label = [street || p.name, p.district ?? p.locality, p.city ?? p.county].filter(Boolean).join(", ");
  return { label, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
}

/** Suggestions for what someone typed. Throws on network errors so callers can tell "none" from "failed". */
export async function searchPlaces(q: string, { limit = 5, init }: { limit?: number; init?: RequestInit } = {}): Promise<Place[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=pt&limit=${limit}&lat=38.72&lon=-9.14&bbox=-9.6,36.9,-6.1,42.2`;
  const res = await fetch(url, init);
  if (!res.ok) return [];
  const json = (await res.json()) as { features?: Feature[] };
  return (json.features ?? []).map(toPlace);
}

/** Best match for a typed place, or null when nothing matches or the lookup fails. */
export async function firstPlace(q: string, init?: RequestInit): Promise<Place | null> {
  if (q.trim().length < 2) return null;
  try {
    return (await searchPlaces(q, { limit: 1, init }))[0] ?? null;
  } catch {
    return null;
  }
}
