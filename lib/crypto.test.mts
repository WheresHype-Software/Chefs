import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { decryptSecret, encryptSecret, maskIban, maskPhone, readKey, safeEqual, sha256 } from "./crypto.ts";

const key = randomBytes(32);

test("readKey accepts base64 and hex, rejects anything else", () => {
  assert.equal(readKey(key.toString("base64")).length, 32);
  assert.equal(readKey(key.toString("hex")).length, 32);
  assert.throws(() => readKey(undefined), /not set/);
  assert.throws(() => readKey("too-short"), /32 bytes/);
});

test("a secret survives a round trip", () => {
  const iban = "PT50000201231234567890154";
  assert.equal(decryptSecret(encryptSecret(iban, key), key), iban);
});

test("the same value encrypts differently every time", () => {
  assert.notEqual(encryptSecret("PT50", key), encryptSecret("PT50", key));
});

test("a tampered ciphertext is rejected, never silently wrong", () => {
  const blob = encryptSecret("PT50000201231234567890154", key);
  const parts = blob.split(".");
  const flipped = Buffer.from(parts[3]!, "base64");
  flipped[0] = flipped[0]! ^ 0xff;
  parts[3] = flipped.toString("base64");
  assert.throws(() => decryptSecret(parts.join("."), key));
  assert.throws(() => decryptSecret(blob, randomBytes(32)));
  assert.throws(() => decryptSecret("nonsense", key), /unreadable/);
});

test("sha256 is stable and safeEqual compares without throwing on length", () => {
  assert.equal(sha256("ao lume"), sha256("ao lume"));
  assert.equal(sha256("ao lume").length, 64);
  assert.ok(safeEqual("abc", "abc"));
  assert.ok(!safeEqual("abc", "abd"));
  assert.ok(!safeEqual("abc", "abcd"));
});

test("masks keep only what a person needs to recognise the value", () => {
  assert.equal(maskIban("PT50 0002 0123 1234 5678 9015 4"), "••••0154");
  assert.equal(maskPhone("+351912345678"), "••••••••••678");
});
