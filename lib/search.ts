import "server-only";
import { firstPlace } from "./geocode";
import { withPhotos } from "./data";
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

export async function searchChefs(q: SearchQuery): Promise<SearchResult> {
  const place =
    q.lat != null && q.lng != null
      ? { lat: q.lat, lng: q.lng }
      : q.where
        ? await firstPlace(q.where, { signal: AbortSignal.timeout(2500), next: { revalidate: 86400 } })
        : null;

  if (!hasSupabase) return { chefs: [], place };

  const { data, error } = await createAnonClient().rpc("chefs_near", {
    p_lat: place?.lat ?? null,
    p_lng: place?.lng ?? null,
    p_service: q.service === "all" ? null : q.service,
    p_category: q.cuisine,
    p_date: q.date,
  });
  if (error) throw new Error(`chefs_near: ${error.message}`);
  return { chefs: sortChefs(await withPhotos((data ?? []) as Omit<ChefCard, "portrait" | "dishes">[]), Boolean(place)), place };
}
