import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseWord, readInfoResponse, readStatus } from "./status";

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

// A resposta verdadeira de um pagamento com cartão, copiada do que a EuPago devolveu.
const REAL_CARD_RESPONSE = {
  entidade: null,
  referencia: "415564",
  identificador: "eedc3561-aafb-483d-bb8c-2060d452e5b3",
  estado: 0,
  data_criacao: "2026-11-07",
  hora_criacao: "15:29:51",
  estado_referencia: "paga",
  pagamentos: [
    {
      trid: 29755640,
      estado: "paga",
      valor: "64.80000",
      comissao: "1.70800",
      arquivada: false,
      data_pagamento: "2026-11-07",
      hora_pagamento: "15:31:19",
      local_pagamento: null,
      data_previsao_transferencia: "2026-11-10",
    },
  ],
  sucesso: true,
  resposta: "OK",
};

test("a resposta verdadeira de um cartão pago é lida como paga", () => {
  const read = readInfoResponse(REAL_CARD_RESPONSE);
  assert.equal(read?.status, "paid");
  assert.equal(read?.amountCents, 6480, "64,80 € vêm de dentro de pagamentos[], não do topo");
  assert.equal(read?.transactionId, "29755640");
});

test("um nulo num campo não deita a leitura abaixo", () => {
  // entidade: null era o que fazia o schema recusar a resposta inteira e perder o "paga".
  assert.equal(readInfoResponse({ ...REAL_CARD_RESPONSE, entidade: null })?.status, "paid");
  assert.equal(readInfoResponse({ ...REAL_CARD_RESPONSE, valor: null })?.status, "paid");
});

test("uma referência ainda por pagar não é lida como paga", () => {
  const pending = { entidade: "82307", referencia: "100502152", estado: 0, estado_referencia: "pendente", pagamentos: [], sucesso: true };
  const read = readInfoResponse(pending);
  assert.equal(read?.status, "pending");
  assert.equal(read?.amountCents, null);
});

test("um código negativo é uma recusa, não um pagamento por fazer", () => {
  assert.equal(readInfoResponse({ estado: -8, resposta: "Invalid Reference" }), null);
});
