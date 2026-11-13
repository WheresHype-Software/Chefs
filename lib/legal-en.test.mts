import assert from "node:assert/strict";
import { test } from "node:test";
import { contractText } from "./contract";
import { contractTextEn } from "./contract.en";
import { englishLegalDate } from "./legal.en";

test("englishLegalDate turns the Portuguese version dates into English ones", () => {
  assert.equal(englishLegalDate("10 de novembro de 2026"), "10 November 2026");
  assert.equal(englishLegalDate("4 de março de 2027"), "4 March 2027");
  assert.equal(englishLegalDate("v3"), "v3");
});

// The English contract is a courtesy translation: it must follow the binding Portuguese text
// clause by clause, without dropping or adding numbers, deadlines or legal references.
test("the English contract keeps the clauses and figures of the Portuguese one", () => {
  const clauses = (s: string) => s.match(/^\d+\. /gm);
  assert.deepEqual(clauses(contractTextEn()), clauses(contractText()));
  const figures = (s: string) => [...s.matchAll(/\d+(?:\/\d+)?/g)].map((m) => m[0]).filter((n) => !/^\d\.?$/.test(n));
  const pt = new Set(figures(contractText()));
  const en = new Set(figures(contractTextEn()));
  assert.deepEqual([...en].sort(), [...pt].sort());
});
