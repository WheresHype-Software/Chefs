import assert from "node:assert/strict";
import { test } from "node:test";
import { contactPhone, whatsappLink } from "@/lib/contact";

test("a nine digit number is assumed Portuguese", () => {
  const p = contactPhone("919924943");
  assert.deepEqual(p, { display: "919924943", tel: "+351919924943", whatsapp: "351919924943" });
});

test("spaces and dashes are how people actually write numbers", () => {
  assert.equal(contactPhone("919 924 943")?.whatsapp, "351919924943");
  assert.equal(contactPhone("91-992-4943")?.tel, "+351919924943");
});

test("a country code already there is kept, written either way", () => {
  assert.equal(contactPhone("+351 919 924 943")?.whatsapp, "351919924943");
  assert.equal(contactPhone("00351919924943")?.whatsapp, "351919924943");
});

test("a foreign number keeps its own country code", () => {
  assert.equal(contactPhone("+44 7700 900123")?.whatsapp, "447700900123");
});

test("the display stays as it was typed, so the chef recognises it", () => {
  assert.equal(contactPhone("  +351 919 924 943 ")?.display, "+351 919 924 943");
});

test("too short to be a phone, and nothing at all", () => {
  assert.equal(contactPhone("12345"), null);
  assert.equal(contactPhone(""), null);
  assert.equal(contactPhone(null), null);
  assert.equal(contactPhone(undefined), null);
});

test("a prepared message survives the trip", () => {
  const p = contactPhone("919924943")!;
  assert.equal(whatsappLink(p), "https://wa.me/351919924943");
  assert.equal(whatsappLink(p, "Olá! Sou a Rita"), "https://wa.me/351919924943?text=Ol%C3%A1!%20Sou%20a%20Rita");
});
