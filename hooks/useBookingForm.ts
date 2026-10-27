"use client";

import { useState, useTransition } from "react";
import { requestBooking } from "@/app/actions";
import type { Place } from "@/components/AddressSearch";
import { useMonthCalendar } from "@/hooks/useMonthCalendar";
import type { ChefCard } from "@/lib/types";

export type Contact = { name: string; email: string; phone: string; notes: string };
export type SentBooking = { ref: string; link: string };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** All state and rules of the booking request form; the components only render it. */
export function useBookingForm(chef: ChefCard, options: { initialOfferId?: string; initialAddress?: Place | null } = {}) {
  const [offerIndex, setOfferIndex] = useState(() =>
    Math.max(
      0,
      chef.offers.findIndex((o) => o.id === options.initialOfferId),
    ),
  );
  const offer = chef.offers[offerIndex]!;
  const calendar = useMonthCalendar(chef.id);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(() => Math.max(offer.minGuests, offer.unit === "pessoa" ? 4 : 1));
  const [address, setAddressText] = useState(options.initialAddress?.label ?? "");
  const [place, setPlace] = useState<Place | null>(options.initialAddress ?? null);
  const [contact, setContact] = useState<Contact>({ name: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentBooking | null>(null);
  const [pending, startTransition] = useTransition();

  const maxGuests = offer.maxGuests ?? 200;
  const needsAddress = offer.mode === "home" || offer.mode === "delivery";
  const estimate = offer.priceModel === "quote" || offer.price == null ? null : offer.price * guests;
  const missingContact = !contact.name.trim() || !contact.email.trim() || !contact.phone.trim();
  const ready = Boolean(day && time && !missingContact && (!needsAddress || address.trim()));
  const ctaLabel = !day ? "Escolha um dia" : !time ? "Escolha a hora" : !ready ? "Complete os seus dados" : "Pedir reserva";

  function chooseOffer(index: number) {
    const next = chef.offers[index]!;
    setOfferIndex(index);
    setTime(null);
    setGuests((g) => clamp(g, next.minGuests, next.maxGuests ?? 200));
  }

  function setAddress(text: string) {
    setAddressText(text);
    setPlace(null); // typed text no longer matches the picked coordinates
  }

  function updateContact(field: keyof Contact, value: string) {
    setContact((c) => ({ ...c, [field]: value }));
  }

  function submit() {
    if (!ready || !day || !time) return;
    setError(null);
    startTransition(async () => {
      const result = await requestBooking({
        offerId: offer.id,
        date: day,
        time,
        guests,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes || undefined,
        ...(needsAddress ? { address, lat: place?.lat, lng: place?.lng } : {}),
      });
      if (result.ok) setSent({ ref: result.ref, link: result.link });
      else setError(result.error);
    });
  }

  return {
    offer,
    offerIndex,
    chooseOffer,
    calendar,
    day,
    setDay,
    time,
    setTime,
    guests,
    setGuests,
    maxGuests,
    address,
    setAddress,
    setPlace,
    contact,
    updateContact,
    needsAddress,
    estimate,
    ready,
    ctaLabel,
    submit,
    pending,
    error,
    sent,
  };
}
