"use client";

import { useSyncExternalStore } from "react";

/**
 * True while the element with `id` has not been reached yet (it starts below the viewport).
 * False once it is on screen or scrolled past, and during SSR.
 */
export function useBelowViewport(id: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const el = document.getElementById(id);
      if (!el) return () => {};
      const io = new IntersectionObserver(onChange);
      io.observe(el);
      return () => io.disconnect();
    },
    () => {
      const el = document.getElementById(id);
      return el ? el.getBoundingClientRect().top > window.innerHeight : false;
    },
    () => false,
  );
}
