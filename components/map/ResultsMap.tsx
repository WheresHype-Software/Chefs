"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LISBON } from "@/components/map/map-style";
import { createPin } from "@/components/map/pin";
import { ResultsMapControls } from "@/components/map/ResultsMapControls";
import { useMapLibre } from "@/hooks/useMapLibre";
import type { LocationStatus } from "@/hooks/useMyLocation";
import { circleRing, type LatLng } from "@/lib/geo";
import type { ChefCard } from "@/lib/types";

const AREA = "al-area";
const EMPTY = { type: "FeatureCollection" as const, features: [] };

type MapLibre = typeof import("maplibre-gl");

/** Frames the points with room for the controls and the bottom card; Lisbon when there are none. */
function fitPoints(m: MLMap, lib: MapLibre, points: LatLng[], duration = 700) {
  if (!points.length) return void m.easeTo({ center: LISBON, zoom: 11.5, duration });
  const bounds = new lib.LngLatBounds();
  points.forEach((p) => bounds.extend([p.lng, p.lat]));
  m.fitBounds(bounds, { padding: { top: 90, bottom: 60, left: 50, right: 70 }, maxZoom: 13.5, duration });
}

type Props = {
  chefs: ChefCard[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  /** The visitor's position, or the place they searched: shown as a dot and used for travel times. */
  origin: LatLng | null;
  onLocate: () => void;
  locating: LocationStatus;
  /** Set inside a scrolling page: one finger (or the wheel) scrolls the page, two fingers move the map. */
  embedded?: boolean;
  /** Overlay at the bottom of the map (the selected chef's card). */
  children?: ReactNode;
};

/** Search results on a map: a pin per chef, the selected chef's service area, and map controls. */
export function ResultsMap({ chefs, selectedId, hoveredId, onSelect, origin, onLocate, locating, embedded = false, children }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const { map, lib, ready } = useMapLibre(container, { cooperativeGestures: embedded });
  const pins = useRef(new Map<string, { marker: Marker; node: HTMLDivElement }>());
  const originPin = useRef<Marker | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Pins and the map's click handler are made once; they call the latest onSelect through this.
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  });

  const points = () => [...chefs, ...(origin ? [origin] : [])];

  // Pins follow the results; clicking the empty map clears the selection.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !lib.current) return;
    const markers = pins.current;
    markers.forEach(({ marker }) => marker.remove());
    markers.clear();
    chefs.forEach((chef, i) => {
      const node = createPin(chef, (id) => selectRef.current(id), 150 + i * 60);
      const marker = new lib.current!.Marker({ element: node, anchor: "bottom" }).setLngLat([chef.lng, chef.lat]).addTo(m);
      markers.set(chef.id, { marker, node });
    });
    if (!m.getSource(AREA)) {
      m.addSource(AREA, { type: "geojson", data: EMPTY });
      m.addLayer({ id: `${AREA}-fill`, type: "fill", source: AREA, paint: { "fill-color": "#1D4AA1", "fill-opacity": 0.08 } });
      m.addLayer({
        id: `${AREA}-line`,
        type: "line",
        source: AREA,
        paint: { "line-color": "#1D4AA1", "line-width": 1.5, "line-dasharray": [2, 2] },
      });
      m.on("click", () => selectRef.current(null));
    }
    fitPoints(m, lib.current, points(), 0);
    return () => markers.forEach(({ marker }) => marker.remove());
    // Reframing on a new origin is the next effect's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, chefs]);

  // Selected and hovered pins stand out; the selected chef's service area is drawn.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    pins.current.forEach(({ node }, id) => {
      node.dataset.sel = String(id === selectedId);
      node.dataset.hot = String(id === hoveredId);
      node.style.zIndex = id === selectedId || id === hoveredId ? "5" : "1";
    });
    const chef = chefs.find((c) => c.id === selectedId);
    (m.getSource(AREA) as GeoJSONSource | undefined)?.setData(
      chef
        ? { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circleRing(chef, Number(chef.radiusKm))] } }
        : EMPTY,
    );
    if (chef && !m.getBounds().contains([chef.lng, chef.lat])) m.easeTo({ center: [chef.lng, chef.lat], duration: 600 });
  }, [ready, chefs, selectedId, hoveredId, map]);

  // The origin dot; finding the visitor reframes the map around them and the chefs.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !lib.current) return;
    originPin.current?.remove();
    originPin.current = null;
    if (!origin) return;
    const dot = document.createElement("div");
    dot.className = "al-origin";
    dot.setAttribute("aria-label", "A sua localização");
    originPin.current = new lib.current.Marker({ element: dot }).setLngLat([origin.lng, origin.lat]).addTo(m);
    fitPoints(m, lib.current, points());
    // Only a new origin reframes; chef changes reframe in the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, origin]);

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen?.();
  }

  return (
    <div ref={frame} className="fabric relative h-full w-full overflow-hidden bg-[#F1F0EC]">
      {/* MapLibre's stylesheet makes its container position: relative, so it is sized, not inset. */}
      <div ref={container} className="h-full w-full" aria-label="Mapa dos chefs" role="region" />
      <ResultsMapControls
        onZoomIn={() => map.current?.zoomIn()}
        onZoomOut={() => map.current?.zoomOut()}
        onFit={() => map.current && lib.current && fitPoints(map.current, lib.current, points())}
        onFullscreen={toggleFullscreen}
        fullscreen={fullscreen}
        onLocate={onLocate}
        locating={locating}
      />
      {children}
    </div>
  );
}
