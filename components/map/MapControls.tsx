"use client";

import { useState, type RefObject } from "react";
import type { ChefMapHandle } from "@/components/map/ChefMap";

/** Zoom, 2D/3D and recenter buttons for the chef map. */
export function MapControls({ map }: { map: RefObject<ChefMapHandle | null> }) {
  const [flat, setFlat] = useState(false);
  return (
    <div className="absolute bottom-[212px] right-2.5 z-[4] flex flex-col gap-1.5 md:bottom-auto md:right-4 md:top-24">
      <button type="button" className="ctl" onClick={() => map.current?.zoomIn()} aria-label="Aproximar">
        +
      </button>
      <button type="button" className="ctl" onClick={() => map.current?.zoomOut()} aria-label="Afastar">
        −
      </button>
      <button
        type="button"
        className="ctl !text-[11px] font-semibold tracking-[.08em]"
        onClick={() => setFlat(map.current?.toggle3d() ?? false)}
        aria-label="Alternar vista 2D e 3D"
      >
        {flat ? "3D" : "2D"}
      </button>
      <button type="button" className="ctl" onClick={() => map.current?.recenter()} aria-label="Centrar mapa">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111110" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  );
}
