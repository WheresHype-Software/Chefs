"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import { trackPixel } from "@/lib/meta-pixel";

/** Meta's standard loader: defines window.fbq and queues calls until the script arrives. */
function loadPixel(id: string) {
  const w = window as unknown as { fbq?: unknown; _fbq?: unknown };
  if (w.fbq) return;
  type Queue = ((...args: unknown[]) => void) & { queue: unknown[]; callMethod?: (...a: unknown[]) => void; push: unknown; loaded: boolean; version: string };
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Queue;
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
  (fbq as unknown as (c: string, v: string) => void)("init", id);
}

/** Loads the pixel only after the visitor accepts cookies, then counts a page view on every navigation. */
export function MetaPixel({ id }: { id: string }) {
  const consent = useConsent();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== "granted" || lastPath.current === pathname) return;
    loadPixel(id);
    lastPath.current = pathname;
    trackPixel("PageView");
  }, [consent, id, pathname]);

  return null;
}
