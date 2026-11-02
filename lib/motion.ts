import type { CSSProperties } from "react";

/** Staggers .al-rv scroll reveals (globals.css): the nth sibling starts `step` % of the entry later. */
export function revealDelay(index: number, step = 8): CSSProperties {
  return { "--rv-delay": `${index * step}%` } as CSSProperties;
}
