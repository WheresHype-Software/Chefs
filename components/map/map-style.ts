import type { Map as MLMap, StyleSpecification } from "maplibre-gl";
import { publicEnv } from "@/lib/env";

// Free vector tiles, no API key: https://openfreemap.org
export const STYLE_URL = publicEnv.mapStyleUrl;
export const LISBON: [number, number] = [-9.155, 38.725];

// Used if the tile server can't be reached: a plain "chef's whites" canvas, pins still work.
const OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#F1F0EC" } }],
};

/** The tile style, or the offline canvas when the tile server doesn't answer within 4 s. */
export async function loadStyle(): Promise<string | StyleSpecification> {
  try {
    const res = await fetch(STYLE_URL, { signal: AbortSignal.timeout(4000) });
    return res.ok ? STYLE_URL : OFFLINE_STYLE;
  } catch {
    return OFFLINE_STYLE;
  }
}

/** Loads MapLibre on demand; its worker is served from /vendor (scripts/copy-maplibre-worker.mjs). */
export async function loadMapLibre() {
  const maplibre = await import("maplibre-gl");
  maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
  return maplibre;
}

/** Pushes positron towards the brand palette: warm paper ground, pale water, white roads. */
export function restyle(map: MLMap, { buildings = true } = {}) {
  for (const layer of map.getStyle().layers ?? []) {
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#F1F0EC");
      if (layer.id.startsWith("water") && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", "#E1E5E7");
      if (/park|landcover_wood|landuse_park/.test(layer.id) && layer.type === "fill")
        map.setPaintProperty(layer.id, "fill-color", "#E4E7E0");
      if (layer.type === "line" && /highway|road/.test(layer.id)) map.setPaintProperty(layer.id, "line-color", "#FBFBF9");
      if (layer.type === "symbol") map.setPaintProperty(layer.id, "text-color", "#76726B");
    } catch {
      // Some layers use expressions we leave untouched.
    }
  }
  if (buildings && map.getSource("openmaptiles") && !map.getLayer("al-buildings")) {
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
