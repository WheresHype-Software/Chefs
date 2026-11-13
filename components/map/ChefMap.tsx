"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { useLocale } from "next-intl";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { LISBON, loadMapLibre, loadStyle, restyle } from "@/components/map/map-style";
import { createPin } from "@/components/map/pin";
import type { Locale } from "@/lib/i18n/routing";
import type { ChefCard } from "@/lib/types";

const TILT = 54;
const BEARING = -14;

export type ChefMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  toggle3d: () => boolean;
  recenter: () => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
};

type Props = {
  chefs: ChefCard[];
  visible: Set<string>;
  selectedId: string | null;
  onPick: (id: string) => void;
  onInteract: () => void;
  home?: { lat: number; lng: number } | null;
  padRight: number;
};

export const ChefMap = forwardRef<ChefMapHandle, Props>(function ChefMap(
  { chefs, visible, selectedId, onPick, onInteract, home, padRight },
  ref,
) {
  const locale = useLocale() as Locale;
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; node: HTMLDivElement }>());
  const flat = useRef(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const interactRef = useRef(onInteract);
  interactRef.current = onInteract;

  useEffect(() => {
    let cancelled = false;
    let instance: MLMap | null = null;
    const pins = markers.current;
    (async () => {
      const [maplibre, style] = await Promise.all([loadMapLibre(), loadStyle()]);
      if (cancelled || !el.current) return;
      const small = window.innerWidth < 760;
      const m = new maplibre.Map({
        container: el.current,
        style,
        center: LISBON,
        zoom: small ? 11.4 : 12.2,
        pitch: TILT,
        bearing: BEARING,
        maxPitch: 70,
        attributionControl: { compact: true },
        cooperativeGestures: small,
      });
      // Keep pins clear of the search card (desktop) and the card rail.
      m.setPadding(small ? { top: 260, bottom: 220, left: 0, right: 0 } : { top: 80, bottom: 200, left: 430, right: 0 });
      instance = m;
      map.current = m;
      m.on("style.load", () => restyle(m));
      m.on("dragstart", () => interactRef.current());
      m.on("zoomstart", (e) => e.originalEvent && interactRef.current());
      syncMarkers(maplibre);
    })();
    return () => {
      cancelled = true;
      pins.forEach(({ marker }) => marker.remove());
      pins.clear();
      instance?.remove();
      map.current = null;
    };
    // The map is created once; markers sync in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncMarkers(maplibre?: typeof import("maplibre-gl")) {
    const m = map.current;
    if (!m) return;
    void (async () => {
      const lib = maplibre ?? (await loadMapLibre());
      const seen = new Set<string>();
      chefs.forEach((c, i) => {
        seen.add(c.id);
        if (markers.current.has(c.id)) return;
        const node = createPin(c, (id) => pickRef.current(id), localeRef.current, 300 + i * 110);
        const marker = new lib.Marker({ element: node, anchor: "bottom", pitchAlignment: "viewport", rotationAlignment: "viewport" })
          .setLngLat([c.lng, c.lat])
          .addTo(m);
        markers.current.set(c.id, { marker, node });
      });
      markers.current.forEach((v, id) => {
        if (!seen.has(id)) {
          v.marker.remove();
          markers.current.delete(id);
        }
      });
      paintMarkers();
    })();
  }

  function paintMarkers() {
    markers.current.forEach(({ node }, id) => {
      const sel = id === selectedId;
      node.dataset.sel = String(sel);
      node.dataset.hidden = String(!visible.has(id));
      node.style.zIndex = sel ? "5" : "1";
      const pulse = node.querySelector(".al-pulse");
      if (sel && !pulse) {
        const p = document.createElement("span");
        p.className = "al-pulse";
        node.prepend(p);
      } else if (!sel && pulse) pulse.remove();
    });
  }

  useEffect(() => {
    syncMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chefs]);

  useEffect(() => {
    paintMarkers();
    const c = chefs.find((x) => x.id === selectedId);
    if (c && map.current) {
      const wide = padRight > 0;
      map.current.easeTo({
        center: [c.lng, c.lat],
        padding: wide ? { right: padRight, left: 430, top: 80, bottom: 200 } : { top: 60, bottom: 420, left: 0, right: 0 },
        duration: 900,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, visible, padRight]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    toggle3d: () => {
      flat.current = !flat.current;
      map.current?.easeTo({ pitch: flat.current ? 0 : TILT, bearing: flat.current ? 0 : BEARING, duration: 900 });
      return flat.current;
    },
    recenter: () => {
      flat.current = false;
      map.current?.easeTo({
        center: home ? [home.lng, home.lat] : LISBON,
        zoom: home ? 13 : 12.2,
        pitch: TILT,
        bearing: BEARING,
        duration: 900,
      });
    },
    flyTo: (lng, lat, zoom = 13) => map.current?.flyTo({ center: [lng, lat], zoom, duration: 1400 }),
  }));

  // MapLibre's stylesheet makes its container position: relative, so it gets a sized wrapper.
  return (
    <div className="fabric absolute inset-0">
      <div ref={el} className="h-full w-full" />
    </div>
  );
});
