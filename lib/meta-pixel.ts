"use client";

import { readConsent } from "./consent";
import { publicEnv } from "./env";

/**
 * The Meta Pixel, in one place. Nothing reaches Meta unless the visitor accepted cookies: the
 * script is not even downloaded before that. Once loaded it is told "grant", and "revoke" if the
 * visitor changes their mind (see MetaPixel).
 *
 * Conversion events carry an eventID: the same id the server would use for the Conversions API,
 * so Meta counts the pair once. trackPixel also remembers ids it has sent in this tab, so a
 * re-render or a refresh of a "sent" screen does not count the same action twice.
 */

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
type PixelEvent = "PageView" | "CompleteRegistration" | "Schedule" | "ViewContent" | "Search";

const fbqOf = () => (window as unknown as { fbq?: Fbq }).fbq;

/** Meta's standard loader: defines window.fbq and queues calls until the script arrives. */
function load(id: string): Fbq {
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return w.fbq;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq & { push: unknown; loaded: boolean; version: string };
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  w.fbq = fbq;
  w._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("consent", "grant");
  fbq("init", id);
  return fbq;
}

/** The pixel, loaded on first use, or null when there is no pixel ID or no consent. */
export function ensurePixel(): Fbq | null {
  if (typeof window === "undefined" || !publicEnv.metaPixelId || readConsent() !== "granted") return null;
  return load(publicEnv.metaPixelId);
}

/** Tells an already loaded pixel to stop (the visitor withdrew consent). */
export function revokePixel(): void {
  if (typeof window === "undefined") return;
  fbqOf()?.("consent", "revoke");
}

const SENT_KEY = "aolume-pixel-sent";

function alreadySent(eventId: string): boolean {
  try {
    const sent: string[] = JSON.parse(window.sessionStorage.getItem(SENT_KEY) ?? "[]");
    if (sent.includes(eventId)) return true;
    window.sessionStorage.setItem(SENT_KEY, JSON.stringify([...sent.slice(-49), eventId]));
    return false;
  } catch {
    return false; // Storage blocked: React's own guards (refs, effects) still stop re-renders.
  }
}

/**
 * Sends one event. With an eventId it is sent at most once per tab, and Meta deduplicates it
 * against a server event with the same id. Returns whether it went out.
 */
export function trackPixel(event: PixelEvent, params?: Record<string, unknown>, eventId?: string): boolean {
  const fbq = ensurePixel();
  if (!fbq) return false;
  if (eventId && alreadySent(eventId)) return false;
  if (eventId) fbq("track", event, params ?? {}, { eventID: eventId });
  else fbq("track", event, params);
  return true;
}
