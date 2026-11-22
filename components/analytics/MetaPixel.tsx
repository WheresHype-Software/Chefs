"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import { revokePixel, trackPixel } from "@/lib/meta-pixel";

/** Counts a page view on every navigation once cookies are accepted; revokes if they are withdrawn. */
export function MetaPixel() {
  const consent = useConsent();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (consent === "unknown") return;
    if (consent !== "granted") {
      revokePixel();
      lastPath.current = null;
      return;
    }
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPixel("PageView");
  }, [consent, pathname]);

  return null;
}
