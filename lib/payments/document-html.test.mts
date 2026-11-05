import assert from "node:assert/strict";
import { test } from "node:test";
import { renderPayoutDocument, type DocumentSnapshot } from "./document-html";

const snapshot: DocumentSnapshot = {
  number: "AL-PAG-2026-0001",
  issuedAt: "2026-11-08T10:00:00.000Z",
  platform: { name: "Where's Hype Software", nif: "516834797", address: "Vila Franca de Xira, Lisboa", email: "ola@aolume.com" },
  chef: {
    legalName: "Carla Maria Nunes",
    nif: "123456789",
    entityType: "individual",
    vatRegime: "isento_art53",
    address: "Rua dos Remédios 44",
    postalCode: "1100-443",
    city: "Lisboa",
    country: "PT",
  },
  booking: { ref: "AL-1108-0493", date: "2026-11-04", service: "Jantar do Minho", guests: 6 },
  amounts: { bookingValue: 330, deposit: 99, commissionPercent: 12, commission: 39.6, payout: 59.4 },
  transfer: { ibanLast4: "0154", bankReference: "TRF-99321", paidAt: "2026-11-08T10:00:00.000Z", batchReference: "LOTE-202611-001" },
  agreementVersion: 1,
};

test("the document carries everything the chef's accountant needs", () => {
  const html = renderPayoutDocument(snapshot);
  for (const needle of ["AL-PAG-2026-0001", "Carla Maria Nunes", "NIF 123456789", "1100-443", "AL-1108-0493", "TRF-99321", "•••• 0154"]) {
    assert.ok(html.includes(needle), needle);
  }
});

test("the arithmetic is spelled out, and the total is the one that gets paid", () => {
  const html = renderPayoutDocument(snapshot);
  assert.ok(html.includes("330 €"), "booking value");
  assert.ok(html.includes("99 €"), "signal");
  assert.ok(html.includes("− 39,60 €"), "commission, as a deduction");
  assert.ok(html.includes("59,40 €"), "what is transferred");
  assert.ok(html.includes("12% do valor da reserva"));
});

test("it says what it is not", () => {
  const html = renderPayoutDocument(snapshot);
  assert.ok(html.includes("Este documento não é uma fatura"));
  assert.ok(html.includes("versão 1"));
});

test("the same snapshot always produces the same bytes", () => {
  assert.equal(renderPayoutDocument(snapshot), renderPayoutDocument(structuredClone(snapshot)));
});

test("a chef's name cannot inject markup", () => {
  const html = renderPayoutDocument({ ...snapshot, chef: { ...snapshot.chef, legalName: '<img src=x onerror="alert(1)">' } });
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
});

test("a company shows its VAT regime instead of the exemption", () => {
  const html = renderPayoutDocument({ ...snapshot, chef: { ...snapshot.chef, entityType: "company", vatRegime: "normal" } });
  assert.ok(html.includes("Regime normal de IVA"));
  assert.ok(!html.includes("artigo 53"));
});
