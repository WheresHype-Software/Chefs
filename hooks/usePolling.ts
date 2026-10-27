"use client";

import { useEffect, useRef } from "react";

/** Calls `callback` every `intervalMs` while the tab is visible. A failed call is skipped; the next tick retries. */
export function usePolling(callback: () => unknown, intervalMs: number, enabled = true) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      Promise.resolve()
        .then(() => latest.current())
        .catch(() => {});
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
