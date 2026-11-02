"use client";

import { useRef, useState } from "react";
import { ResultsMap } from "@/components/map/ResultsMap";
import { ChefTile } from "@/components/search/ChefTile";
import { MapChefCard } from "@/components/search/MapChefCard";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMyLocation } from "@/hooks/useMyLocation";
import type { LatLng } from "@/lib/geo";
import type { ChefCard } from "@/lib/types";

type View = "list" | "map";

const LOCATION_HINT = {
  denied: "Sem acesso à localização. Pode ativá-la nas definições do navegador.",
  unavailable: "Não foi possível encontrar a sua localização.",
} as const;

/**
 * Results as a list beside a map (desktop), or either one behind a "Lista / Mapa" switch (phones).
 * Hovering a chef lights up their pin; picking a pin opens their card and finds them in the list.
 */
export function SearchResults({ chefs, place }: { chefs: ChefCard[]; place: LatLng | null }) {
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const me = useMyLocation();
  const wide = useMediaQuery("(min-width: 1024px)", false);
  const mapBox = useRef<HTMLDivElement>(null);
  const selected = chefs.find((c) => c.id === selectedId) ?? null;
  const origin = me.location ?? place;

  function select(id: string | null) {
    setSelectedId(id);
    if (id && wide) document.getElementById(`chef-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function switchTo(next: View) {
    setView(next);
    if (next === "map") requestAnimationFrame(() => mapBox.current?.scrollIntoView({ block: "start" }));
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,44%)]">
      <section aria-label="Resultados" className={`px-5 py-8 md:px-8 lg:py-10 ${view === "map" ? "hidden lg:block" : ""}`}>
        <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-10 p-0 sm:grid-cols-2">
          {chefs.map((chef, i) => (
            <li
              key={chef.id}
              id={`chef-${chef.id}`}
              onMouseEnter={() => setHoveredId(chef.id)}
              onMouseLeave={() => setHoveredId((h) => (h === chef.id ? null : h))}
              className={`scroll-mt-24 rounded-[12px] outline-offset-[6px] transition-[outline-color] ${
                chef.id === selectedId ? "outline outline-2 outline-cobalt" : "outline-transparent"
              }`}
            >
              <ChefTile chef={chef} priority={i < 2} />
            </li>
          ))}
        </ul>
      </section>

      <div
        ref={mapBox}
        className={`scroll-mt-16 h-[calc(100dvh-4rem)] lg:sticky lg:top-16 lg:block ${view === "list" ? "hidden" : "block"}`}
      >
        <ResultsMap
          chefs={chefs}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={select}
          origin={origin}
          onLocate={me.locate}
          locating={me.status}
        >
          {(me.status === "denied" || me.status === "unavailable") && (
            <p role="status" className="absolute left-3 right-16 top-3 z-[4] m-0 rounded-[8px] bg-white px-3 py-2 text-[13px] shadow">
              {LOCATION_HINT[me.status]}
            </p>
          )}
          {selected && (
            <MapChefCard chef={selected} origin={origin} originIsMe={Boolean(me.location)} onClose={() => setSelectedId(null)} raised />
          )}
        </ResultsMap>
      </div>

      <div className="pointer-events-none sticky bottom-5 z-10 flex justify-center pb-[env(safe-area-inset-bottom)] lg:hidden">
        <button
          type="button"
          className="btn pointer-events-auto rounded-full !px-6 shadow-[0_10px_30px_-10px_rgb(20_32_51/0.5)]"
          onClick={() => switchTo(view === "list" ? "map" : "list")}
        >
          {view === "list" ? "Ver no mapa" : "Ver lista"}
        </button>
      </div>
    </div>
  );
}
