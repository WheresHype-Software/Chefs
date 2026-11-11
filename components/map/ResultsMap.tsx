"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LISBON } from "@/components/map/map-style";
import { createGroup, createPin, groupChefs } from "@/components/map/pin";
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
  m.fitBounds(bounds, { padding: { top: 130, bottom: 70, left: 60, right: 80 }, maxZoom: 13.5, duration });
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

  // Pins follow the results; chefs too close together become one group, redrawn after every move.
  // The selected and hovered chefs are never grouped, so the one being looked at stays visible.
  const focus = useRef({ selectedId, hoveredId });
  useEffect(() => {
    focus.current = { selectedId, hoveredId };
  });

  // The drop-in animation is for the first appearance only, not every redraw after a move.
  const drawn = useRef(false);

  /**
   * Brings the markers in line with the current grouping. Markers that are still right are kept as
   * they are, so a zoom or pan doesn't rebuild every pin (which reloaded each photo and flickered).
   */
  function drawPins() {
    const m = map.current;
    const lib_ = lib.current;
    if (!m || !lib_) return;
    const markers = pins.current;
    const { selectedId: sel, hoveredId: hot } = focus.current;
    const alone = new Set([sel, hot].filter((x): x is string => Boolean(x)));
    const wanted = new Set<string>();
    groupChefs(m, chefs, alone).forEach((group, i) => {
      const delay = drawn.current ? undefined : 150 + i * 60;
      if (group.length === 1) {
        const chef = group[0]!;
        wanted.add(chef.id);
        let entry = markers.get(chef.id);
        if (!entry) {
          const node = createPin(chef, (id) => selectRef.current(id), delay);
          const marker = new lib_.Marker({ element: node, anchor: "bottom" }).setLngLat([chef.lng, chef.lat]).addTo(m);
          entry = { marker, node };
          markers.set(chef.id, entry);
        }
        entry.node.dataset.sel = String(chef.id === sel);
        entry.node.dataset.hot = String(chef.id === hot);
        entry.node.style.zIndex = alone.has(chef.id) ? "5" : "1";
        return;
      }
      const key = `group:${group.map((c) => c.id).join(",")}`;
      wanted.add(key);
      if (markers.has(key)) return;
      const node = createGroup(
        group,
        () => {
          const bounds = new lib_.LngLatBounds();
          group.forEach((c) => bounds.extend([c.lng, c.lat]));
          m.fitBounds(bounds, { padding: 120, maxZoom: Math.max(m.getZoom() + 2, 13), duration: 700 });
        },
        delay,
      );
      const lng = group.reduce((a, c) => a + c.lng, 0) / group.length;
      const lat = group.reduce((a, c) => a + c.lat, 0) / group.length;
      const marker = new lib_.Marker({ element: node, anchor: "center" }).setLngLat([lng, lat]).addTo(m);
      markers.set(key, { marker, node });
    });
    markers.forEach(({ marker }, key) => {
      if (wanted.has(key)) return;
      marker.remove();
      markers.delete(key);
    });
    drawn.current = true;
  }
  const drawRef = useRef(drawPins);
  useEffect(() => {
    drawRef.current = drawPins;
  });

  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !lib.current) return;
    drawn.current = false;
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
      m.on("moveend", () => drawRef.current());
    }
    fitPoints(m, lib.current, points(), 0);
    drawPins();
    const markers = pins.current;
    return () => {
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
    };
    // Reframing on a new origin is the next effect's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, chefs]);

  // The selected chef's service area; selecting or hovering pulls that chef out of any group.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    drawPins();
    const chef = chefs.find((c) => c.id === selectedId);
    (m.getSource(AREA) as GeoJSONSource | undefined)?.setData(
      chef
        ? { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circleRing(chef, Number(chef.radiusKm))] } }
        : EMPTY,
    );
    if (chef && !m.getBounds().contains([chef.lng, chef.lat])) m.easeTo({ center: [chef.lng, chef.lat], duration: 600 });
    // drawPins reads the latest selection through focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
