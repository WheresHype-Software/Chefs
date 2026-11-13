"use client";

import { Link } from "@/lib/i18n/navigation";
import { useState } from "react";
import { ResultsMap } from "@/components/map/ResultsMap";
import { ChefTile } from "@/components/search/ChefTile";
import { MapChefCard } from "@/components/search/MapChefCard";
import { useMyLocation } from "@/hooks/useMyLocation";
import type { ChefCard } from "@/lib/types";

type Props = { chefs: ChefCard[]; featured: ChefCard[] };

/** A few chefs to start with, beside the map of everyone cooking: the home page's "who is near me". */
export function NearbyChefs({ chefs, featured }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const me = useMyLocation();
  const selected = chefs.find((c) => c.id === selectedId) ?? null;

  return (
    <section aria-labelledby="perto-title" className="mx-auto max-w-[1280px] px-5 py-14 md:px-8 md:py-24">
      <div className="al-rv mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div className="flex flex-col gap-2">
          <h2 id="perto-title" className="d m-0 text-[clamp(28px,3.4vw,40px)] leading-[1.05]">
            Quem cozinha perto de si
          </h2>
          <p className="m-0 max-w-[60ch] text-[16px] text-muted">
            Toque num chef no mapa para ver a zona, o preço e o menu. Os chefs mostram a zona onde trabalham, nunca a morada.
          </p>
        </div>
        <Link href="/procurar" className="text-[16px] font-semibold text-cobalt no-underline hover:underline">
          Ver todos os chefs →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-8">
        <ul className="-mx-5 m-0 flex list-none snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:content-start">
          {featured.map((chef) => (
            <li
              key={chef.id}
              className="w-[82%] shrink-0 snap-start sm:w-auto"
              onMouseEnter={() => setHoveredId(chef.id)}
              onMouseLeave={() => setHoveredId((h) => (h === chef.id ? null : h))}
            >
              <ChefTile chef={chef} />
            </li>
          ))}
        </ul>
        <div className="al-rv h-[380px] overflow-hidden rounded-[10px] border border-line md:h-[520px] lg:sticky lg:top-20 lg:h-[560px]">
          <ResultsMap
            chefs={chefs}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
            origin={me.location}
            onLocate={me.locate}
            locating={me.status}
            embedded
          >
            {selected && <MapChefCard chef={selected} origin={me.location} originIsMe onClose={() => setSelectedId(null)} />}
          </ResultsMap>
        </div>
      </div>
    </section>
  );
}
