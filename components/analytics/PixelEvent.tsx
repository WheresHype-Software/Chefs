"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { trackPixel } from "@/lib/meta-pixel";

type Props = { event: "ViewContent" | "Search"; params: Record<string, unknown>; eventId: string };

/**
 * Sends one pixel event for the page it sits on (a chef's page, a search). Waits for consent, and
 * the eventId keeps it to once per tab for the same chef or the same search.
 */
export function PixelEvent({ event, params, eventId }: Props) {
  const consent = useConsent();
  const key = JSON.stringify(params);
  useEffect(() => {
    if (consent === "granted") trackPixel(event, JSON.parse(key) as Record<string, unknown>, eventId);
  }, [consent, event, key, eventId]);
  return null;
}
