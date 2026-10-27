// Bookings made or opened on this device, so a guest can find them again without an account.
// Only what is needed to list them; access itself stays in the httpOnly per-booking cookie.

export type RecentBooking = { id: string; ref: string; chef: string; date: string };

const KEY = "aolume:bookings";
const MAX = 10;

export function readRecentBookings(): RecentBooking[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(list) ? (list as RecentBooking[]).filter((b) => b && typeof b.id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberBooking(booking: RecentBooking): void {
  if (booking.id === "demo") return;
  try {
    const rest = readRecentBookings().filter((b) => b.id !== booking.id);
    localStorage.setItem(KEY, JSON.stringify([booking, ...rest].slice(0, MAX)));
  } catch {
    // Private mode or storage full: the list is a convenience, the booking link still works.
  }
}
