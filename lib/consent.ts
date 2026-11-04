"use client";

import { useSyncExternalStore } from "react";

// The visitor's answer to the cookie banner, kept in this browser only.
export type Consent = "granted" | "denied" | null;

const KEY = "aolume-consent";
const listeners = new Set<() => void>();

function read(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent): void {
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private mode or blocked storage: the banner simply shows again next visit.
  }
  listeners.forEach((l) => l());
}

/** Current consent; "unknown" while rendering on the server, so nothing flashes before hydration. */
export function useConsent(): Consent | "unknown" {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    read,
    () => "unknown",
  );
}
