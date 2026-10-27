"use client";

import { useBelowViewport } from "@/hooks/useBelowViewport";

type Props = { targetId: string; price: string; rating: string };

/** Phones: keeps "Pedir reserva" in reach until the booking form scrolls into view. */
export function MobileBookingBar({ targetId, price, rating }: Props) {
  const show = useBelowViewport(targetId);
  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[6px] transition-transform duration-300 ease-[var(--ease-out)] ${show ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px]">
            desde <strong className="num font-bold">{price}</strong>
          </span>
          <span className="truncate text-[13px] text-muted">{rating}</span>
        </div>
        <a href={`#${targetId}`} className="btn shrink-0">
          Pedir reserva
        </a>
      </div>
    </div>
  );
}
