import assert from "node:assert/strict";
import { test } from "node:test";
import { formatIban, ibanLast4, isPortugueseIban, isValidIban, isValidNif, isValidPostalCode, normalisePhone } from "./fiscal";

test("a NIF is accepted only when its check digit adds up", () => {
  // Real check digits, computed by the modulo-11 rule.
  assert.ok(isValidNif("501442600")); // company
  assert.ok(isValidNif("123456789")); // individual
  assert.ok(isValidNif("516834797")); // the platform's own, from lib/legal.ts
  assert.ok(!isValidNif("123456788"), "wrong check digit");
  assert.ok(!isValidNif("12345678"), "too short");
  assert.ok(!isValidNif("4123456789"), "too long");
  assert.ok(!isValidNif("412345678"), "4 is only valid as 45");
  assert.ok(!isValidNif("abcdefghi"));
});

test("spaces and dots do not change a NIF", () => {
  assert.equal(isValidNif("516 834 797"), isValidNif("516834797"));
});

test("an IBAN is checked by its own check digits", () => {
  assert.ok(isValidIban("PT50000201231234567890154"));
  assert.ok(isValidIban("PT50 0002 0123 1234 5678 9015 4"));
  assert.ok(!isValidIban("PT50000201231234567890155"), "one digit off");
  assert.ok(!isValidIban("PT5000020123123456789015"), "too short for PT");
  assert.ok(!isValidIban(""));
});

test("Portuguese IBANs are recognised apart from foreign ones", () => {
  assert.ok(isPortugueseIban("PT50000201231234567890154"));
  assert.ok(isValidIban("DE89370400440532013000"));
  assert.ok(!isPortugueseIban("DE89370400440532013000"));
});

test("IBANs are stored tight and shown in fours", () => {
  assert.equal(formatIban("PT50000201231234567890154"), "PT50 0002 0123 1234 5678 9015 4");
  assert.equal(ibanLast4("PT50 0002 0123 1234 5678 9015 4"), "0154");
});

test("postal codes need the hyphen", () => {
  assert.ok(isValidPostalCode("1250-096"));
  assert.ok(!isValidPostalCode("1250096"));
});

test("MB WAY numbers come out as nine digits, however they were typed", () => {
  assert.equal(normalisePhone("+351 912 345 678"), "912345678");
  assert.equal(normalisePhone("912345678"), "912345678");
  assert.equal(normalisePhone("351 961234567"), "961234567");
  assert.equal(normalisePhone("212345678"), null, "a landline is not MB WAY");
  assert.equal(normalisePhone("91234567"), null, "too short");
});
