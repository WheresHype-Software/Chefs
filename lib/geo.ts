export type LatLng = { lat: number; lng: number };

/** Great-circle distance in km (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** A circle of `km` around `center` as a closed GeoJSON ring of [lng, lat] points (for drawing areas). */
export function circleRing(center: LatLng, km: number, steps = 64): [number, number][] {
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI;
    return [center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)];
  });
}
