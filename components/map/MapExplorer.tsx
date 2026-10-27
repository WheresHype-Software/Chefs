"use client";

import { useRef, useState } from "react";
import type { Place } from "@/components/AddressSearch";
import { BookingPanel } from "@/components/booking/BookingPanel";
import { ChefMap, type ChefMapHandle } from "@/components/map/ChefMap";
import { ChefRail } from "@/components/map/ChefRail";
import { MapControls } from "@/components/map/MapControls";
import { MapSearchCard } from "@/components/map/MapSearchCard";
import { useChefFilters } from "@/hooks/useChefFilters";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ServiceFilter } from "@/lib/constants";
import type { ChefCard } from "@/lib/types";

const PANEL_WIDTH = 470;

/** The home page map: search card, 3D map with pins, chef rail and the booking panel. */
export function MapExplorer({ chefs, service }: { chefs: ChefCard[]; service?: ServiceFilter }) {
  const map = useRef<ChefMapHandle>(null);
  const filters = useChefFilters(chefs, service);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const wide = useMediaQuery("(min-width: 761px)", true);
  const chef = chefs.find((c) => c.id === selectedId) ?? null;

  // Any interaction hides the "drag to explore" hint.
  function selectChef(id: string) {
    setTouched(true);
    setSelectedId(id);
  }

  function changeService(service: ServiceFilter) {
    setTouched(true);
    filters.setService(service);
  }

  function changeCuisine(cuisine: string) {
    setTouched(true);
    filters.setCuisine(cuisine);
  }

  function changePlace(place: Place | null) {
    setTouched(true);
    filters.setPlace(place);
    if (place) map.current?.flyTo(place.lng, place.lat, 13);
  }

  return (
    <section id="mapa" aria-label="Mapa de chefs" className="relative h-[740px] overflow-hidden md:h-[880px]">
      <ChefMap
        ref={map}
        chefs={chefs}
        visible={filters.visibleIds}
        selectedId={selectedId}
        onPick={selectChef}
        onInteract={() => setTouched(true)}
        home={filters.place}
        padRight={chef && wide ? PANEL_WIDTH : 0}
      />

      <MapSearchCard
        count={filters.matches.length}
        place={filters.place}
        service={filters.service}
        cuisine={filters.cuisine}
        onService={changeService}
        onCuisine={changeCuisine}
        onPlace={changePlace}
      />

      <MapControls map={map} />

      {!touched && (
        <span className="lab pointer-events-none absolute bottom-[226px] left-1/2 z-[3] hidden -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-cobalt px-4 py-[11px] text-white md:block">
          Arraste para explorar · toque num chef
        </span>
      )}

      <ChefRail chefs={filters.matches} selectedId={selectedId} onSelect={selectChef} panelOpen={Boolean(chef)} />

      <aside
        aria-label="Chef selecionado"
        className={`fixed bottom-0 left-0 right-0 z-[7] h-[90dvh] overflow-y-auto rounded-t-xl border border-b-0 border-line bg-white shadow-[0_30px_80px_rgba(17,17,16,.14)] transition-transform duration-[650ms] ease-[cubic-bezier(.2,.8,.2,1)] md:absolute md:bottom-4 md:left-auto md:right-4 md:top-4 md:h-auto md:w-[440px] md:max-w-[calc(100%-32px)] md:rounded-[3px] md:border-b ${
          chef ? "translate-x-0 translate-y-0" : "translate-y-[105%] md:translate-x-[calc(100%+40px)] md:translate-y-0"
        }`}
      >
        <span className="sticky top-0 z-[2] block h-[22px] bg-white md:hidden" aria-hidden="true">
          <span className="mx-auto mt-2.5 block h-1 w-10 rounded bg-line-3" />
        </span>
        {chef && <BookingPanel key={chef.id} chef={chef} initialAddress={filters.place} onClose={() => setSelectedId(null)} />}
      </aside>
    </section>
  );
}
