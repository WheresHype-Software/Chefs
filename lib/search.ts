import "server-only";
import { firstPlace } from "./geocode";
import { distanceKm } from "./geo";
import { MOCK_CHEFS, mockCalendar } from "./mock";
import type { SearchQuery } from "./search-params";
import { createAnonClient, hasSupabase } from "./supabase/server";
import type { ChefCard } from "./types";

export type SearchResult = { chefs: ChefCard[]; place: { lat: number; lng: number } | null };

function sortChefs(chefs: ChefCard[], hasPlace: boolean): ChefCard[] {
  return [...chefs].sort((a, b) =>
    hasPlace && a.distanceKm != null && b.distanceKm != null
      ? a.distanceKm - b.distanceKm
      : (b.rating ?? 4.5) * Math.log(2 + b.reviewCount) - (a.rating ?? 4.5) * Math.log(2 + a.reviewCount),
  );
}

/** Demo mode: the same rules as chefs_near, applied to the seed chefs. */
function searchDemo(q: SearchQuery, place: { lat: number; lng: number } | null): ChefCard[] {
  const day = q.date ? new Date(`${q.date}T12:00:00`) : null;
  return MOCK_CHEFS.map((c) => ({ ...c, distanceKm: place ? Math.round(distanceKm(place, c) * 10) / 10 : null }))
    .filter((c) => !place || (c.distanceKm ?? 0) <= Number(c.radiusKm))
    .filter((c) => q.service === "all" || c.services.includes(q.service))
    .filter((c) => !q.cuisine || c.categories.includes(q.cuisine))
    .filter((c) => !day || mockCalendar(c.id, day, day).available.includes(q.date!));
}

export async function searchChefs(q: SearchQuery): Promise<SearchResult> {
  const place =
    q.lat != null && q.lng != null
      ? { lat: q.lat, lng: q.lng }
      : q.where
        ? await firstPlace(q.where, { signal: AbortSignal.timeout(2500), next: { revalidate: 86400 } })
        : null;

  if (!hasSupabase) return { chefs: sortChefs(searchDemo(q, place), Boolean(place)), place };

  const { data, error } = await createAnonClient().rpc("chefs_near", {
    p_lat: place?.lat ?? null,
    p_lng: place?.lng ?? null,
    p_service: q.service === "all" ? null : q.service,
    p_category: q.cuisine,
    p_date: q.date,
  });
  if (error) throw new Error(`chefs_near: ${error.message}`);
  return { chefs: sortChefs((data ?? []) as ChefCard[], Boolean(place)), place };
}
