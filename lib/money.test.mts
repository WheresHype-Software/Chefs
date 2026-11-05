import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingValueCents, computeBookingMoney, percentOf, requiredDepositPercent, toCents, toEuros } from "./money";

const RULES = { commissionPercent: 12, commissionMinCents: 300, depositMarginPercent: 5 };

test("euros and cents convert without drift", () => {
  assert.equal(toCents(0.1) + toCents(0.2), toCents(0.3));
  assert.equal(toCents("123.45"), 12345);
  assert.equal(toCents(null), 0);
  assert.equal(toCents(""), 0);
  assert.equal(toCents("not a number"), 0);
  assert.equal(toEuros(5432), 54.32);
});

test("a 300 € dinner with a 30 % signal", () => {
  const m = computeBookingMoney({ valueCents: 30000, depositPercent: 30 }, RULES);
  assert.deepEqual(m, { valueCents: 30000, depositCents: 9000, commissionCents: 3600, payoutCents: 5400, capped: false });
});

test("the minimum commission takes over on small orders", () => {
  // A 20 € cake: 12 % is 2,40 €, below the 3 € floor.
  const m = computeBookingMoney({ valueCents: 2000, depositPercent: 30 }, RULES);
  assert.equal(m.commissionCents, 300);
  assert.equal(m.depositCents, 600);
  assert.equal(m.payoutCents, 300);
  assert.equal(m.capped, false);
});

test("the commission never exceeds the signal we actually hold", () => {
  // A chef asking 2 % cannot be accepted (requiredDepositPercent blocks it); if one slips through,
  // the chef is paid nothing rather than owing us money, and the booking is flagged.
  const m = computeBookingMoney({ valueCents: 10000, depositPercent: 2 }, RULES);
  assert.equal(m.depositCents, 200);
  assert.equal(m.commissionCents, 200);
  assert.equal(m.payoutCents, 0);
  assert.equal(m.capped, true);
});

test("no signal means no money through the app and no commission", () => {
  for (const depositPercent of [0, null, undefined]) {
    const m = computeBookingMoney({ valueCents: 30000, depositPercent }, RULES);
    assert.equal(m.depositCents, 0);
    assert.equal(m.commissionCents, 0);
    assert.equal(m.payoutCents, 0);
  }
});

test("a booking with no value yet (quote) produces nothing", () => {
  assert.deepEqual(computeBookingMoney({ valueCents: 0, depositPercent: 30 }, RULES), {
    valueCents: 0,
    depositCents: 0,
    commissionCents: 0,
    payoutCents: 0,
    capped: false,
  });
});

test("percentages round to the nearest cent, half up", () => {
  assert.equal(percentOf(3333, 12), 400); // 399,96 -> 400
  assert.equal(percentOf(1250, 10), 125);
  assert.equal(percentOf(1, 50), 1); // 0,5 -> 1
  // A 100 % signal is possible; more than that is clamped.
  assert.equal(computeBookingMoney({ valueCents: 5000, depositPercent: 150 }, RULES).depositCents, 5000);
});

test("the signal must leave room for the commission", () => {
  assert.equal(requiredDepositPercent(RULES), 17);
  assert.equal(requiredDepositPercent({ ...RULES, commissionPercent: 12.5 }), 18);
  const atMinimum = computeBookingMoney({ valueCents: 10000, depositPercent: 17 }, RULES);
  assert.ok(atMinimum.payoutCents > 0);
  assert.equal(atMinimum.capped, false);
});

test("a quoted price wins over the estimate", () => {
  assert.equal(bookingValueCents({ quoted_price: "250.00", estimate: "300.00" }), 25000);
  assert.equal(bookingValueCents({ quoted_price: null, estimate: "300.00" }), 30000);
  assert.equal(bookingValueCents({ quoted_price: null, estimate: null }), 0);
});
