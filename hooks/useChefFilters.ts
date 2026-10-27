"use client";

import { useMemo, useState } from "react";
import type { Place } from "@/components/AddressSearch";
import type { ServiceFilter } from "@/lib/constants";
import { distanceKm } from "@/lib/geo";
import type { ChefCard } from "@/lib/types";

/**
 * Service, cuisine and location filters for the map. A chef matches a location when it sits
 * inside their service radius.
 */
export function useChefFilters(chefs: ChefCard[], initialService: ServiceFilter = "all") {
  const [service, setService] = useState<ServiceFilter>(initialService);
  const [cuisine, setCuisine] = useState("all");
  const [place, setPlace] = useState<Place | null>(null);

  // Follow ?servico= links (from the service list) without a sync effect.
  const [lastInitial, setLastInitial] = useState(initialService);
  if (initialService !== lastInitial) {
    setLastInitial(initialService);
    setService(initialService);
  }

  const matches = useMemo(
    () =>
      chefs.filter(
        (c) =>
          (service === "all" || c.services.includes(service)) &&
          (cuisine === "all" || c.categories.includes(cuisine)) &&
          (!place || distanceKm(place, c) <= Number(c.radiusKm)),
      ),
    [chefs, service, cuisine, place],
  );
  const visibleIds = useMemo(() => new Set(matches.map((c) => c.id)), [matches]);

  return { service, setService, cuisine, setCuisine, place, setPlace, matches, visibleIds };
}
