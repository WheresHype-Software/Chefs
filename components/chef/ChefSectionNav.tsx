export type ChefSection = { id: string; label: string };

/** Sticky jump links under the site header, so every part of a long profile is one tap away. */
export function ChefSectionNav({ sections, bookable }: { sections: ChefSection[]; bookable: boolean }) {
  return (
    <nav
      aria-label="Secções do perfil"
      className="sticky top-16 z-10 -mx-5 border-b border-line bg-white/95 px-5 backdrop-blur-[6px] md:mx-0 md:px-0"
    >
      <div className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full px-3 py-1.5 text-[15px] font-medium text-ink no-underline hover:bg-paper"
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
