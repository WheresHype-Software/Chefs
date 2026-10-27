"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker, StyleSpecification } from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { publicEnv } from "@/lib/env";
import { fromPrice, initials } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

// Free vector tiles, no API key: https://openfreemap.org
const STYLE_URL = publicEnv.mapStyleUrl;
const LISBON: [number, number] = [-9.155, 38.725];
const TILT = 54;
const BEARING = -14;

// Used if the tile server can't be reached: a plain "chef's whites" canvas, pins still work.
const OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#F1F0EC" } }],
};

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

function restyle(map: MLMap) {
  // Push positron towards the mockup palette: warm paper ground, pale water, white roads.
  for (const layer of map.getStyle().layers ?? []) {
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#F1F0EC");
      if (layer.id.startsWith("water") && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", "#E1E5E7");
      if (/park|landcover_wood|landuse_park/.test(layer.id) && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", "#E4E7E0");
      if (layer.type === "line" && /highway|road/.test(layer.id)) map.setPaintProperty(layer.id, "line-color", "#FBFBF9");
      if (layer.type === "symbol") map.setPaintProperty(layer.id, "text-color", "#76726B");
    } catch {
      // Some layers use expressions we leave untouched.
    }
  }
  if (map.getSource("openmaptiles") && !map.getLayer("al-buildings")) {
    map.addLayer({
      id: "al-buildings",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": "#FFFFFF",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.85,
      },
    });
  }
}

export const ChefMap = forwardRef<ChefMapHandle, Props>(function ChefMap(
  { chefs, visible, selectedId, onPick, onInteract, home, padRight },
  ref,
) {
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
      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      let style: string | StyleSpecification = STYLE_URL;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(STYLE_URL, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) style = OFFLINE_STYLE;
      } catch {
        style = OFFLINE_STYLE;
      }
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
    const create = (c: ChefCard, i: number) => {
      const node = document.createElement("div");
      node.className = "al-pin";
      node.innerHTML = `
        <div class="al-bub" style="animation-delay:${300 + i * 110}ms;display:flex;flex-direction:column;align-items:center">
          <button type="button"><span class="ini d"></span><span class="price"></span></button>
          <span class="stem"></span><span class="foot"></span>
        </div>`;
      const btn = node.querySelector("button")!;
      btn.querySelector(".ini")!.textContent = initials(c.name);
      btn.querySelector(".price")!.textContent = fromPrice(c.offers).replace("orçamento", "Orçamento");
      btn.setAttribute("aria-label", `${c.name}, ${c.headline ?? ""}, ${c.area ?? ""}`);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        pickRef.current(c.id);
      });
      return node;
    };
    void (async () => {
      const lib = maplibre ?? (await import("maplibre-gl"));
      const seen = new Set<string>();
      chefs.forEach((c, i) => {
        seen.add(c.id);
        if (markers.current.has(c.id)) return;
        const node = create(c, i);
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
