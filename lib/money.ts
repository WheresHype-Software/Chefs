/**
 * Every amount the platform moves, decided in one place.
 *
 * The client pays a signal through the app; the platform keeps a commission on the *whole* booking
 * value and transfers the rest to the chef after the dinner. Because the commission is a slice of
 * the booking but comes out of the signal, the signal has to be big enough to hold it — see
 * `requiredDepositPercent`.
 *
 * Everything here works in integer cents. Floating point euros drift (0.1 + 0.2), and a drift of a
 * cent in a payout is a real complaint from a real person. The database mirrors these rules in
 * `compute_booking_money()`; the two must change together.
 */

export type MoneyRules = {
  /** Percentage of the booking value kept by the platform. */
  commissionPercent: number;
  /** Floor for the commission, in cents: a percentage of a 20 € cake is not worth the transfer. */
  commissionMinCents: number;
  /** How much bigger than the commission the signal must be, in percentage points. */
  depositMarginPercent: number;
};

export type BookingMoney = {
  /** What the booking is worth: the quoted price when there is one, otherwise the estimate. */
  valueCents: number;
  /** What the client pays through the app. */
  depositCents: number;
  /** What the platform keeps. */
  commissionCents: number;
  /** What the chef receives after the dinner. */
  payoutCents: number;
  /**
   * True when the commission had to be cut down to fit inside the signal. It should never happen —
   * `requiredDepositPercent` prevents it — so when it does, the booking is flagged for the admin.
   */
  capped: boolean;
};

export const ZERO_MONEY: BookingMoney = { valueCents: 0, depositCents: 0, commissionCents: 0, payoutCents: 0, capped: false };

/** Euros (number or numeric string from Postgres) to cents. Null-ish becomes 0. */
export function toCents(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Cents back to euros, for display and for writing numeric(10,2) columns. */
export function toEuros(cents: number): number {
  return Math.round(cents) / 100;
}

/** A percentage of an amount in cents, rounded to the nearest cent (half up, as Postgres rounds). */
export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/**
 * The smallest signal a chef may ask for once payments are on: enough to cover the commission and
 * still leave the chef something. A chef below this cannot have a booking accepted.
 */
export function requiredDepositPercent(rules: MoneyRules): number {
  return Math.ceil(rules.commissionPercent + rules.depositMarginPercent);
}

/**
 * The whole arithmetic of a booking. `depositPercent` is the chef's own setting; a missing or zero
 * one means no money moves through the app, so there is no commission either.
 */
export function computeBookingMoney(
  input: { valueCents: number; depositPercent: number | null | undefined },
  rules: MoneyRules,
): BookingMoney {
  const valueCents = Math.max(0, Math.round(input.valueCents));
  const depositPercent = input.depositPercent ?? 0;
  if (valueCents === 0 || depositPercent <= 0) return { ...ZERO_MONEY, valueCents };

  const depositCents = percentOf(valueCents, Math.min(depositPercent, 100));
  const wanted = Math.max(percentOf(valueCents, rules.commissionPercent), rules.commissionMinCents);
  // The commission can never exceed what we actually hold, whatever the rules say.
  const commissionCents = Math.min(wanted, depositCents);
  return {
    valueCents,
    depositCents,
    commissionCents,
    payoutCents: depositCents - commissionCents,
    capped: commissionCents < wanted,
  };
}

/** The booking value: a quoted price wins over the estimate, both may be absent. */
export function bookingValueCents(booking: { quoted_price?: number | string | null; estimate?: number | string | null }): number {
  return toCents(booking.quoted_price ?? booking.estimate ?? null);
}
