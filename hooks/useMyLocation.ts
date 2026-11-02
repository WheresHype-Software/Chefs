"use client";

import { useState } from "react";
import type { LatLng } from "@/lib/geo";

export type LocationStatus = "idle" | "locating" | "found" | "denied" | "unavailable";

/** Asks the browser for the visitor's position, only when they press a button for it. */
export function useMyLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("found");
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return { location, status, locate };
}
