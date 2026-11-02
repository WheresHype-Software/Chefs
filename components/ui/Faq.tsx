import type { ReactNode } from "react";

export type FaqItem = [question: string, answer: ReactNode];

/** Questions that open in place (native <details>, so it works without JavaScript). */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="min-w-0 border-t border-line-2">
      {items.map(([q, a]) => (
        <details key={q} className="group border-b border-line-2 py-[18px]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <span className="d text-[clamp(18px,2vw,22px)] leading-[1.2]">{q}</span>
            <span aria-hidden="true" className="text-2xl font-light leading-none transition-transform duration-300 group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mb-1.5 mt-2.5 max-w-[640px] text-base text-ink-3">{a}</div>
        </details>
      ))}
    </div>
  );
}
