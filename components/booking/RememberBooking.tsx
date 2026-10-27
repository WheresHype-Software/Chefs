"use client";

import { useEffect } from "react";
import { rememberBooking, type RecentBooking } from "@/lib/recent-bookings";

/** Adds this booking to the device's "Acompanhar pedido" list. Renders nothing. */
export function RememberBooking({ booking }: { booking: RecentBooking }) {
  const { id, ref, chef, date } = booking;
  useEffect(() => {
    rememberBooking({ id, ref, chef, date });
  }, [id, ref, chef, date]);
  return null;
}
