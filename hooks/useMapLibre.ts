"use client";

import type { Map as MLMap, MapOptions } from "maplibre-gl";
import { useEffect, useRef, useState, type RefObject } from "react";
import { LISBON, loadMapLibre, loadStyle, restyle } from "@/components/map/map-style";

type MapLibre = Awaited<ReturnType<typeof loadMapLibre>>;

/**
 * Creates a flat, brand-styled MapLibre map in `container` once, keeps it sized to the
 * container (it may start hidden, e.g. behind the phone's "Mapa" toggle) and removes it on unmount.
 * `ready` turns true when the style has loaded and layers or markers can be added.
 */
export function useMapLibre(container: RefObject<HTMLDivElement | null>, options: Partial<MapOptions> = {}) {
  const map = useRef<MLMap | null>(null);
  const lib = useRef<MapLibre | null>(null);
  const [ready, setReady] = useState(false);
  const initial = useRef(options);

  useEffect(() => {
    let cancelled = false;
    let instance: MLMap | null = null;
    let observer: ResizeObserver | null = null;
    (async () => {
      const [maplibre, style] = await Promise.all([loadMapLibre(), loadStyle()]);
      if (cancelled || !container.current) return;
      instance = new maplibre.Map({
        container: container.current,
        style,
        center: LISBON,
        zoom: 11.5,
        attributionControl: { compact: true },
        ...initial.current,
      });
      lib.current = maplibre;
      map.current = instance;
      instance.on("style.load", () => {
        restyle(instance!, { buildings: false });
        setReady(true);
      });
      observer = new ResizeObserver(() => instance?.resize());
      observer.observe(container.current);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      instance?.remove();
      map.current = null;
      setReady(false);
    };
  }, [container]);

  return { map, lib, ready };
}
