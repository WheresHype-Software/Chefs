import "server-only";
import type { BookingStatus } from "../types";
import { demoBookings } from "./demo";
import { chefScope } from "./session";
import type { DashBooking } from "./types";

const BOOKING_COLUMNS =
  "id, ref, status, offer_title, fulfilment_mode, date, time_label, guests, address, distance_km, notes, estimate, pickup_code, fulfilled_at, created_at, client:clients(name, phone, email)";

export async function getBookings(opts: { from?: string; to?: string; statuses?: BookingStatus[] } = {}): Promise<DashBooking[]> {
  const scope = await chefScope();
  if (scope.demo) {
    return demoBookings().filter(
      (b) => (!opts.from || b.date >= opts.from) && (!opts.to || b.date <= opts.to) && (!opts.statuses || opts.statuses.includes(b.status)),
    );
  }
  let q = scope.sb.from("bookings").select(BOOKING_COLUMNS).eq("chef_id", scope.chef.id).order("date").order("time_label");
  if (opts.from) q = q.gte("date", opts.from);
  if (opts.to) q = q.lte("date", opts.to);
  if (opts.statuses) q = q.in("status", opts.statuses);
  const { data } = await q;
  return (data ?? []) as unknown as DashBooking[];
}

export async function getBooking(id: string): Promise<DashBooking | null> {
  const scope = await chefScope();
  if (scope.demo) return demoBookings().find((b) => b.id === id) ?? null;
  const { data } = await scope.sb.from("bookings").select(BOOKING_COLUMNS).eq("chef_id", scope.chef.id).eq("id", id).maybeSingle();
  return (data as unknown as DashBooking) ?? null;
}
