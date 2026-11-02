"use client";

import { useEffect, useState } from "react";

export type NavSection = { id: string; label: string };

/** Sticky jump links under the site header; the section being read is highlighted. */
export function ChefSectionNav({ sections, bookable }: { sections: NavSection[]; bookable: boolean }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    // A section counts as "being read" when it crosses the upper middle of the screen.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Secções do perfil"
      className="sticky top-16 z-10 -mx-5 border-b border-line bg-paper/95 px-5 backdrop-blur-[6px] md:mx-0 md:rounded-[12px] md:border md:bg-white/95 md:px-2"
    >
      <div className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? "location" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[15px] font-medium no-underline transition-colors ${
              active === s.id ? "bg-cobalt-soft font-semibold !text-cobalt-deep" : "!text-ink hover:bg-paper"
            }`}
          >
            {s.label}
          </a>
        ))}
        {bookable && (
          // The wrapper hides it from lg up (the form sits beside the content); .btn would override lg:hidden.
          <span className="ml-auto shrink-0 lg:hidden">
            <a href="#reservar" className="btn btn-sm">
              Pedir reserva
            </a>
          </span>
        )}
      </div>
    </nav>
  );
}
