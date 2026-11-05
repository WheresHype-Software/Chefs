import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDac7Csv, buildDac7Rows, dac7Gaps, quarterOf, type Dac7Activity, type Dac7Seller } from "./dac7";

const carla: Dac7Seller = {
  chefId: "c1",
  entityType: "individual",
  legalName: "Carla Maria Nunes",
  nif: "123456789",
  country: "PT",
  address: "Rua dos Remédios 44",
  postalCode: "1100-443",
  city: "Lisboa",
  birthDate: "1986-04-12",
  birthPlace: "Lisboa",
  companyRegNumber: null,
  iban: "PT50000201231234567890154",
  ibanHolder: "Carla Maria Nunes",
};

const rui: Dac7Seller = {
  ...carla,
  chefId: "c2",
  entityType: "company",
  legalName: "Barata & Filhos, Lda.",
  birthDate: null,
  birthPlace: null,
  companyRegNumber: "501442600",
  iban: null,
  ibanHolder: null,
};

const activities: Dac7Activity[] = [
  { chefId: "c1", paidAt: "2026-02-10", payout: 59.4, commission: 39.6, bookingValue: 330 },
  { chefId: "c1", paidAt: "2026-03-30", payout: 40.6, commission: 24, bookingValue: 200 },
  { chefId: "c1", paidAt: "2026-07-01", payout: 10, commission: 3, bookingValue: 25 },
  { chefId: "c2", paidAt: "2026-11-02", payout: 100, commission: 50, bookingValue: 420 },
  { chefId: "c1", paidAt: "2025-12-31", payout: 999, commission: 999, bookingValue: 999 },
];

test("quarters are counted the way the tax year is", () => {
  assert.equal(quarterOf("2026-01-01"), 0);
  assert.equal(quarterOf("2026-03-31"), 0);
  assert.equal(quarterOf("2026-04-01"), 1);
  assert.equal(quarterOf("2026-12-31"), 3);
});

test("a year's activity is grouped per seller and per quarter", () => {
  const rows = buildDac7Rows([carla, rui], activities, 2026);
  assert.equal(rows.length, 2);

  const c = rows.find((r) => r.seller.chefId === "c1")!;
  assert.equal(c.quarters[0]!.consideration, 100); // 59,40 + 40,60
  assert.equal(c.quarters[0]!.fees, 63.6);
  assert.equal(c.quarters[0]!.activities, 2);
  assert.equal(c.quarters[2]!.consideration, 10);
  assert.equal(c.totals.activities, 3, "the 2025 one does not count");
  assert.equal(c.totals.consideration, 110);
  assert.equal(c.totals.bookingValue, 555);
});

test("a seller with nothing paid in the year is left out", () => {
  const rows = buildDac7Rows([carla, rui], activities, 2024);
  assert.equal(rows.length, 0);
});

test("rows come out ordered by name", () => {
  const rows = buildDac7Rows([carla, rui], activities, 2026);
  assert.equal(rows[0]!.seller.legalName, "Barata & Filhos, Lda.");
});

test("the CSV has a header and one line per seller, with amounts to the cent", () => {
  const csv = buildDac7Csv(buildDac7Rows([carla, rui], activities, 2026));
  const lines = csv.split("\n");
  assert.equal(lines.length, 3);
  assert.ok(lines[0]!.startsWith("tipo;nome_legal;nif;"));
  assert.ok(lines.some((l) => l.includes("singular;Carla Maria Nunes;123456789;PT;")));
  assert.ok(
    lines.some((l) => l.includes("110.00;66.60;3;555.00")),
    "totals",
  );
  // A name with a semicolon or quotes must not break the columns.
  assert.ok(lines.some((l) => l.includes("Barata & Filhos, Lda.")));
});

test("the gaps are named, so the team knows what to chase before January", () => {
  const rows = buildDac7Rows([carla, rui], activities, 2026);
  const complete = rows.find((r) => r.seller.chefId === "c1")!;
  const incomplete = rows.find((r) => r.seller.chefId === "c2")!;
  assert.deepEqual(dac7Gaps(complete), []);
  assert.deepEqual(dac7Gaps(incomplete), ["IBAN"]);
  assert.deepEqual(dac7Gaps({ ...complete, seller: { ...carla, birthDate: null } }), ["data e local de nascimento"]);
});
