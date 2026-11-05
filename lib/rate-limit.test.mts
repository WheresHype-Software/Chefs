import assert from "node:assert/strict";
import { test } from "node:test";
import { callerIp, rateLimit, resetRateLimits } from "./rate-limit";

test("the first requests pass and the ones over the limit do not", () => {
  resetRateLimits();
  const now = 1_000_000;
  for (let i = 0; i < 3; i += 1) assert.ok(rateLimit("a", 3, 60, now).allowed, `request ${i + 1}`);
  const blocked = rateLimit("a", 3, 60, now);
  assert.ok(!blocked.allowed);
  assert.equal(blocked.retryAfterSeconds, 60);
});

test("the window reopens", () => {
  resetRateLimits();
  const now = 2_000_000;
  rateLimit("b", 1, 10, now);
  assert.ok(!rateLimit("b", 1, 10, now + 5_000).allowed);
  assert.ok(rateLimit("b", 1, 10, now + 10_001).allowed);
});

test("keys do not interfere", () => {
  resetRateLimits();
  const now = 3_000_000;
  rateLimit("c", 1, 60, now);
  assert.ok(rateLimit("d", 1, 60, now).allowed);
});

test("the caller's address comes from the first forwarded entry", () => {
  assert.equal(callerIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })), "203.0.113.5");
  assert.equal(callerIp(new Headers({ "x-real-ip": "203.0.113.9" })), "203.0.113.9");
  assert.equal(callerIp(new Headers()), "unknown");
});
