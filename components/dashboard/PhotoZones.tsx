"use client";

import { useEffect, useState } from "react";

export type PhotoZone = { id: string; label: string; status: string; done: boolean };

/**
 * The photos page in three zones (profile photo, verification selfie, dishes), as a bar that
 * stays at the top: each zone with how it stands, one tap to go there, and the zone on screen
 * marked. Long pages of photos read as one list without it; with it, what's missing is visible
 * from anywhere. Sits under the phone's top bar, and the three fit side by side at phone width.
 */
export function PhotoZones({ zones }: { zones: PhotoZone[] }) {
  const [active, setActive] = useState(zones[0]?.id);
  // The zones come as a fresh array on every render; observe again only when the zones change.
  const ids = zones.map((z) => z.id).join(" ");

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        const first = ids.split(" ").find((id) => seen.get(id));
        if (first) setActive(first);
      },
      // A band a little above the middle of the screen: the zone crossing it is the one being read.
      { rootMargin: "-35% 0px -55% 0px" },
    );
    ids.split(" ").forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);

  return (
    <nav
      aria-label="Zonas das fotografias"
      className="sticky top-16 z-10 -mx-4 bg-paper/95 px-4 py-2 backdrop-blur-[6px] md:top-0 md:mx-0 md:px-0"
    >
      <ol className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
        {zones.map((z) => {
          const current = z.id === active;
          return (
            <li key={z.id} className="min-w-0">
              <a
                href={`#${z.id}`}
                aria-current={current ? "location" : undefined}
                onClick={() => setActive(z.id)}
                className={`flex min-h-14 flex-col justify-center gap-0.5 rounded-box border px-2.5 py-2 no-underline transition-colors sm:px-3.5 ${
                  current ? "border-cobalt bg-white" : "border-line-2 bg-white/70 hover:border-line-3"
                }`}
              >
                <span className={`truncate text-[13px] font-semibold sm:text-sm ${current ? "text-cobalt" : "text-ink"}`}>{z.label}</span>
                <span className={`flex items-center gap-1 truncate text-xs ${z.done ? "text-ok" : "text-muted"}`}>
                  {z.done ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
                      <path
                        d="M3 8.5l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-yolk" />
                  )}
                  {z.status}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
