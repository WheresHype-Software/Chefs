import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseWord, readStatus } from "./status";

test("the provider's words for settled are recognised, accents and case aside", () => {
  for (const word of ["Paga", "paga", "PAGO", "Paid", "sucesso", "Sucesso"]) {
    assert.equal(readStatus(word), "paid", word);
  }
});

test("pending, failed, expired and refunded are told apart", () => {
  assert.equal(readStatus("pendente"), "pending");
  assert.equal(readStatus("Pending"), "pending");
  assert.equal(readStatus("activa"), "pending");
  assert.equal(readStatus("Anulada"), "failed");
  assert.equal(readStatus("Expirada"), "expired");
  assert.equal(readStatus("Reembolsada"), "refunded");
});

test("a word we do not know is never read as paid", () => {
  for (const word of ["", null, undefined, "qualquer coisa", "0", "em processamento", "liquidada"]) {
    assert.equal(readStatus(word), "unknown", String(word));
  }
});

test("normaliseWord strips accents rather than mangling them", () => {
  assert.equal(normaliseWord(" Pagamento Efetuado "), "pagamento efetuado");
  assert.equal(normaliseWord("ANULADA"), "anulada");
  assert.equal(normaliseWord("Expirádá"), "expirada");
});

test("o código de resposta não é o estado do pagamento", () => {
  // A EuPago devolve `estado: 0` a dizer "a pergunta correu bem", e o estado verdadeiro em
  // `estado_referencia`. Ler o primeiro como estado responde "unknown" a um pagamento feito.
  assert.equal(readStatus(0), "unknown");
  assert.equal(readStatus("0"), "unknown");
  assert.equal(readStatus("paga"), "paid");
});
