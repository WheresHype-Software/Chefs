import { distanceKm, type LatLng } from "./geo";

/** Streets wind: a trip is roughly this much longer than the straight line. */
const ROAD_FACTOR = 1.3;

/** Longer than this on foot or by bike is not a real option; the car estimate always shows. */
const MAX_SENSIBLE_MINUTES = 90;

/** Average door-to-door city speeds in km/h, traffic and stops included. */
const MODES = [
  { mode: "walk", label: "A pé", kmh: 4.8 },
  { mode: "bike", label: "De bicicleta", kmh: 14 },
  { mode: "car", label: "De carro", kmh: 25 },
] as const;

export type TravelMode = (typeof MODES)[number]["mode"];
export type TravelEstimate = { mode: TravelMode; label: string; minutes: number };

/**
 * Rough travel times between two points, from distance and average speeds. Free and instant;
 * not a route. Chefs' points are zones, so minutes are rounded to the nearest 5.
 */
export function travelEstimates(from: LatLng, to: LatLng): { km: number; times: TravelEstimate[] } {
  const km = distanceKm(from, to) * ROAD_FACTOR;
  const times = MODES.map(({ mode, label, kmh }) => ({ mode, label, minutes: Math.max(5, Math.round(((km / kmh) * 60) / 5) * 5) })).filter(
    (t) => t.mode === "car" || t.minutes <= MAX_SENSIBLE_MINUTES,
  );
  return { km: Math.round(km * 10) / 10, times };
}

/** "45 min", "1 h 20". */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
