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
  // No `lang`: the public Photon only accepts default/en/de/fr and answers 400 to "pt".
  // The default returns local names, which in Portugal are already Portuguese.
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}&lat=38.72&lon=-9.14&bbox=-9.6,36.9,-6.1,42.2`;
  const res = await fetch(url, init);
  if (!res.ok) return [];
  const json = (await res.json()) as { features?: Feature[] };
  return (json.features ?? []).map(toPlace);
}

/**
 * Single lookup with OpenStreetMap's Nominatim, the fallback when Photon is down. Its usage policy
 * allows one-off searches (not autocomplete) from an identified client: browsers send the Referer,
 * the server sends a User-Agent.
 */
async function nominatim(q: string, init?: RequestInit): Promise<Place | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pt&accept-language=pt&q=${encodeURIComponent(q)}`;
  const headers = typeof window === "undefined" ? { "User-Agent": "AoLume/1.0 (https://chefs.whereshype.com)" } : undefined;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return hit ? { label: hit.display_name.split(",").slice(0, 3).join(",").trim(), lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

/** Best match for a typed place: Photon first, Nominatim if Photon fails. Null when nothing matches. */
export async function firstPlace(q: string, init?: RequestInit): Promise<Place | null> {
  if (q.trim().length < 2) return null;
  try {
    const hit = (await searchPlaces(q, { limit: 1, init }))[0];
    if (hit) return hit;
  } catch {
    // Photon unreachable: fall through to Nominatim.
  }
  try {
    return await nominatim(q, init);
  } catch {
    return null;
  }
}
