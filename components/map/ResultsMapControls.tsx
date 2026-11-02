"use client";

import type { LocationStatus } from "@/hooks/useMyLocation";

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onFullscreen: () => void;
  fullscreen: boolean;
  onLocate: () => void;
  locating: LocationStatus;
};

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true };

/** Floating map buttons: fullscreen, zoom, show all chefs, and "use my location". */
export function ResultsMapControls({ onZoomIn, onZoomOut, onFit, onFullscreen, fullscreen, onLocate, locating }: Props) {
  return (
    <div className="absolute right-3 top-3 z-[4] flex flex-col gap-1.5">
      <button type="button" className="ctl" onClick={onFullscreen} aria-label={fullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}>
        <svg {...icon}>
          {fullscreen ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
        </svg>
      </button>
      <button type="button" className="ctl" onClick={onZoomIn} aria-label="Aproximar">
        +
      </button>
      <button type="button" className="ctl" onClick={onZoomOut} aria-label="Afastar">
        −
      </button>
      <button type="button" className="ctl" onClick={onFit} aria-label="Ver todos os chefs">
        <svg {...icon}>
          <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      </button>
      <button
        type="button"
        className="ctl"
        onClick={onLocate}
        disabled={locating === "locating"}
        aria-label="Usar a minha localização"
        aria-pressed={locating === "found"}
      >
        <svg {...icon} className={locating === "locating" ? "animate-pulse" : undefined}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  );
}
