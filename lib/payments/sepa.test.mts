import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSepaCsv, buildSepaXml, sepaAmount, sepaName, type SepaBatch } from "./sepa";

const batch: SepaBatch = {
  messageId: "LOTE-202611-001",
  createdAt: "2026-11-05T12:00:00.000Z",
  executionDate: "2026-11-06",
  debtor: { name: "Where's Hype Software", iban: "PT50 0002 0123 1234 5678 9015 4", bic: "cgdiptpl", nif: "516834797" },
  transfers: [
    { reference: "AL-PAG-2026-0001", name: "Carla Maria Nunes", iban: "PT50000201231234567890154", amountCents: 5400 },
    {
      reference: "AL-PAG-2026-0002",
      name: "João Café & Filhos, Lda.",
      iban: "PT50000201231234567890154",
      bic: "bcompypl",
      amountCents: 12345,
    },
  ],
};

test("the totals in the file are the sum of the transfers, twice over", () => {
  const xml = buildSepaXml(batch);
  assert.equal((xml.match(/<CtrlSum>177\.45<\/CtrlSum>/g) ?? []).length, 2, "group header and payment info");
  assert.equal((xml.match(/<NbOfTxs>2<\/NbOfTxs>/g) ?? []).length, 2);
});

test("amounts always carry two decimals and a dot", () => {
  assert.equal(sepaAmount(5400), "54.00");
  assert.equal(sepaAmount(5), "0.05");
  assert.equal(sepaAmount(123456), "1234.56");
});

test("names are folded to what SEPA accepts and cut at 70", () => {
  assert.equal(sepaName("João Café & Filhos, Lda."), "Joao Cafe Filhos, Lda.");
  assert.equal(sepaName("Ana".padEnd(100, "x")).length, 70);
  assert.equal(sepaName("Rui  \n Barata"), "Rui Barata");
});

test("XML special characters cannot break out of a field", () => {
  const nasty = buildSepaXml({
    ...batch,
    transfers: [{ reference: "R&1", name: '<script>alert("x")</script>', iban: "PT50000201231234567890154", amountCents: 100 }],
  });
  assert.ok(!nasty.includes("<script>"));
  assert.ok(nasty.includes("&amp;"));
});

test("IBANs are written without spaces and BICs upper-cased", () => {
  const xml = buildSepaXml(batch);
  assert.ok(xml.includes("<IBAN>PT50000201231234567890154</IBAN>"));
  assert.ok(xml.includes("<BICFI>CGDIPTPL</BICFI>"), "debtor bank");
  assert.ok(xml.includes("<BICFI>BCOMPYPL</BICFI>"), "the one creditor that has a BIC");
  assert.equal((xml.match(/<CdtrAgt>/g) ?? []).length, 1, "no empty agent for the one without");
});

test("every transfer carries its document number end to end", () => {
  const xml = buildSepaXml(batch);
  assert.ok(xml.includes("<EndToEndId>AL-PAG-2026-0001</EndToEndId>"));
  assert.ok(xml.includes("<Ustrd>Ao Lume AL-PAG-2026-0002</Ustrd>"));
});

test("the CSV lists every transfer and ends with the total", () => {
  const lines = buildSepaCsv(batch).split("\n");
  assert.equal(lines.length, 4);
  assert.ok(lines[0]!.startsWith("referencia;"));
  assert.ok(lines[1]!.includes("AL-PAG-2026-0001;Carla Maria Nunes;PT50000201231234567890154;;54.00;EUR;2026-11-06"));
  assert.ok(lines[3]!.startsWith("TOTAL;2 transferencias;;;177.45"));
});
