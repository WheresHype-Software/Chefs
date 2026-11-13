"use client";

import { useState, useTransition } from "react";
import { requestBooking } from "@/app/actions";
import { callAction } from "@/lib/call-action";
import type { Place } from "@/components/AddressSearch";
import { useMonthCalendar, type MonthCalendarData } from "@/hooks/useMonthCalendar";
import type { ChefCard } from "@/lib/types";

export type Contact = { name: string; email: string; phone: string; notes: string };
export type SentBooking = { id: string; ref: string; link: string; privateLink: string; emailed: boolean };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** All state and rules of the booking request form; the components only render it. */
export function useBookingForm(
  chef: ChefCard,
  options: { initialOfferId?: string; initialAddress?: Place | null; initialCalendar?: MonthCalendarData } = {},
) {
  const [offerIndex, setOfferIndex] = useState(() =>
    Math.max(
      0,
      chef.offers.findIndex((o) => o.id === options.initialOfferId),
    ),
  );
  const offer = chef.offers[offerIndex]!;
  const calendar = useMonthCalendar(chef.id, options.initialCalendar);
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
  const missing = {
    day: !day,
    time: !time,
    address: needsAddress && !address.trim(),
    name: !contact.name.trim(),
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email.trim()),
    phone: !contact.phone.trim(),
  };
  const ready = !Object.values(missing).some(Boolean);
  // After a submit with gaps, each missing field is highlighted until it's filled.
  const [attempted, setAttempted] = useState(false);
  const invalid = (field: keyof typeof missing) => attempted && missing[field];

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

  /** False (and fields highlighted) when something is missing. */
  function submit(): boolean {
    if (!ready || !day || !time) {
      setAttempted(true);
      return false;
    }
    setError(null);
    startTransition(async () => {
      const result = await callAction(() =>
        requestBooking({
          offerId: offer.id,
          date: day,
          time,
          guests,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes || undefined,
          ...(needsAddress ? { address, lat: place?.lat, lng: place?.lng } : {}),
        }),
      );
      if (result.ok)
        setSent({ id: result.bookingId, ref: result.ref, link: result.link, privateLink: result.privateLink, emailed: result.emailed });
      else setError(result.error);
    });
    return true;
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
    missing,
    invalid,
    submit,
    pending,
    error,
    sent,
  };
}
