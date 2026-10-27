"use client";

import type { Place } from "@/components/AddressSearch";
import { BookingForm } from "@/components/booking/BookingForm";
import { ChefIntro } from "@/components/booking/ChefIntro";
import type { ChefCard } from "@/lib/types";

type Props = { chef: ChefCard; onClose: () => void; initialAddress?: Place | null };

/** Slide-in panel on the map: chef intro on top, booking request below. */
export function BookingPanel({ chef, onClose, initialAddress }: Props) {
  return (
    <div className="flex flex-col">
      <ChefIntro chef={chef} onClose={onClose} />
      <div className="px-7 pt-7">
        <BookingForm chef={chef} initialAddress={initialAddress} onClose={onClose} bleed />
      </div>
    </div>
  );
}
