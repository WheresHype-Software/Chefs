import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { hashedEmail, hashedPhone } from "@/lib/meta-hash";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

test("emails are trimmed and lowercased before hashing, as Meta asks", () => {
  assert.equal(hashedEmail("  Ana.Silva@Exemplo.PT "), sha("ana.silva@exemplo.pt"));
  assert.equal(hashedEmail(""), null);
  assert.equal(hashedEmail(null), null);
});

test("phones become digits with the country code before hashing", () => {
  assert.equal(hashedPhone("912 345 678"), sha("351912345678"));
  assert.equal(hashedPhone("+351 912 345 678"), sha("351912345678"));
  assert.equal(hashedPhone("123"), null);
});
