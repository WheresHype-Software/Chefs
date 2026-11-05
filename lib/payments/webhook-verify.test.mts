import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { test } from "node:test";
import { decryptWebhookData, readNotification, readWebhookKey, signPayload, verifySignature } from "./webhook-verify";

const SECRET = "a-shared-secret-from-the-backoffice";

test("a correct signature is accepted in either encoding", () => {
  const payload = '{"transactions":{"reference":"123"}}';
  const { base64, hex } = signPayload(payload, SECRET);
  assert.ok(verifySignature([payload], base64, SECRET));
  assert.ok(verifySignature([payload], hex, SECRET));
  assert.ok(verifySignature([payload], hex.toUpperCase(), SECRET));
  assert.ok(verifySignature([payload], ` ${base64} `, SECRET), "whitespace is trimmed");
});

test("anything else is rejected", () => {
  const payload = '{"transactions":{"reference":"123"}}';
  const { base64 } = signPayload(payload, SECRET);
  assert.ok(!verifySignature([payload], base64, "another-secret"));
  assert.ok(!verifySignature(['{"transactions":{"reference":"124"}}'], base64, SECRET), "a changed body");
  assert.ok(!verifySignature([payload], null, SECRET), "no signature at all");
  assert.ok(!verifySignature([payload], base64, undefined), "no secret configured");
  assert.ok(!verifySignature([null, undefined, ""], base64, SECRET));
});

test("the signature may be over the data field or over the whole body", () => {
  const data = '{"reference":"123"}';
  const body = `{"data":${JSON.stringify(data)}}`;
  const { base64 } = signPayload(data, SECRET);
  assert.ok(verifySignature([data, body], base64, SECRET));
});

test("keys are read as hex, base64 or 32 raw characters", () => {
  const key = randomBytes(32);
  assert.deepEqual(readWebhookKey(key.toString("hex")), key);
  assert.deepEqual(readWebhookKey(key.toString("base64")), key);
  assert.equal(readWebhookKey("x".repeat(32))?.length, 32);
  assert.equal(readWebhookKey("too short"), null);
  assert.equal(readWebhookKey(undefined), null);
});

test("an encrypted body round-trips, and a wrong key gives null instead of throwing", () => {
  const key = randomBytes(32);
  const iv = randomBytes(16);
  const plain = '{"reference":"123","status":"Paga"}';
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");

  assert.equal(decryptWebhookData(encrypted, iv.toString("base64"), key.toString("base64")), plain);
  assert.equal(decryptWebhookData(encrypted, iv.toString("hex"), key.toString("hex")), plain);
  assert.equal(decryptWebhookData(encrypted, iv.toString("base64"), randomBytes(32).toString("base64")), null);
  assert.equal(decryptWebhookData("not base64 at all", iv.toString("base64"), key.toString("base64")), null);
  assert.equal(decryptWebhookData(encrypted, null, key.toString("base64")), null);
});

test("facts are read from either webhook generation", () => {
  const modern = readNotification({
    transactions: { identifier: "AL-1", reference: "100502152", entity: "82307", transactionID: "10409014", amount: 99, status: "Paga" },
  });
  assert.deepEqual(modern, {
    identifier: "AL-1",
    reference: "100502152",
    entity: "82307",
    transactionId: "10409014",
    amountCents: 9900,
    statusWord: "Paga",
  });

  // The old callback is a flat query string: valor, referencia, transacao, identificador.
  const legacy = readNotification({
    valor: "2.00",
    referencia: "102087857",
    transacao: "10409241",
    identificador: "AL-2",
    entidade: "82307",
  });
  assert.equal(legacy.reference, "102087857");
  assert.equal(legacy.transactionId, "10409241");
  assert.equal(legacy.identifier, "AL-2");
  assert.equal(legacy.amountCents, 200);
});

test("a body with no amount does not invent one", () => {
  assert.equal(readNotification({ transactions: { reference: "1" } }).amountCents, null);
});
