# Pagamentos: sinal pago na app, comissão e pagamento ao chef

Especificação para implementar. Substitui `docs/specs/pagamentos-eupago.md` (modelo antigo: a plataforma
só cobrava uma taxa e nunca tocava no dinheiro do serviço). Esse ficheiro é apagado na fase 0.

Decisões já tomadas pelo dono do projeto (2026-11-05):

- O sinal é pago **na app**, entra na conta EuPago do Ao Lume. O Ao Lume paga ao chef depois do jantar.
- **Comissão = % do valor total da reserva**, descontada do sinal. Sem programa de faturação certificado por agora.
- Ao chef é entregue um **documento de pagamento simples** (não é fatura): "pagamos a X, NIF Y, o valor do
  serviço Z; o sinal pedido menos a nossa comissão". O chef **consente no registo**, num contrato que aceita
  ao criar a conta, para que estes documentos já nasçam válidos e consentidos.
- Tudo atrás da flag `PAYMENTS_ENABLED`. Com a flag desligada o site comporta-se exatamente como hoje.

## 0. Contexto e regras do repositório

Next.js 16 (App Router, `proxy.ts`, server actions), React 19, Supabase (RLS, funções `security definer`),
zod 4, Tailwind 4. Esta versão do Next tem mudanças face ao que conheces: lê o guia relevante em
`node_modules/next/dist/docs/` antes de escrever código (ver `AGENTS.md`).

Convenções já usadas e a respeitar: `failWith` / `failInvalid` em `lib/result.ts`, `callAction` no cliente,
`sendEmail` em `lib/email.ts`, `booking_status_guard` para transições, `admin_logs` para auditoria,
crons em `pg_cron`, links curtos e assinados para ficheiros privados (ver `lib/selfie.ts`,
`lib/admin/certificates.ts`). Texto pt-PT. Um ramo e um commit por fase; `git pull --rebase`, nunca merge.

---

## 1. Avisos legais (a confirmar antes de ligar em produção)

Não são opinião jurídica. São os pontos que o advogado e o contabilista têm de fechar.

1. **Receber dinheiro de terceiros.** A partir do momento em que o sinal entra na nossa conta, estamos a
   receber dinheiro que é do chef. Em Portugal isso é um serviço de pagamento, salvo a **isenção do agente
   comercial** (DSP2 art. 3.º b, transposta no DL 91/2018, art. 5.º b): temos de ter **mandato escrito e
   expresso do chef** para receber em nome dele. Esse mandato vai no contrato do chef (secção 6) e nos termos.
2. **Alternativa mais segura, a pedir à EuPago:** `POST /v1/split-payments/{método}` divide o pagamento por
   beneficiários identificados por `externKey` (uma conta EuPago por chef), com `immediatePayment` por
   beneficiário. Se a EuPago confirmar que o pagamento pode ficar retido até depois do jantar, o dinheiro do
   chef nunca passa por nós. Por isso toda a camada de pagamentos fica atrás da interface `PaymentProvider`:
   trocar de modelo não pode obrigar a mexer no fluxo de reserva.
3. **O documento de pagamento não é uma fatura.** Não tem numeração fiscal, não é comunicado à AT, e não
   substitui: (a) a fatura que o chef deve ao cliente pelo serviço, (b) a fatura que nós devemos ao chef pela
   comissão. Enquanto não houver programa certificado, o documento diz isso em texto claro e a comissão é
   registada para faturação posterior (`commission_invoiced_at`, a preencher quando houver faturação).
4. **EuPago não transfere dinheiro para o IBAN do chef.** Os endpoints `/payouts` são só de consulta. O
   pagamento ao chef é uma operação bancária: geramos o lote e o ficheiro SEPA/CSV, o admin executa no banco
   e regista a referência. É intencional — mantém um humano entre a app e o dinheiro a sair.
5. **DAC7 (DL 20/2022).** Ao intermediar a contrapartida passamos a ser plataforma declarante: recolher e
   verificar nome legal, morada fiscal, NIF, data e local de nascimento (singulares) ou número de registo
   comercial (coletivas) e o identificador da conta de pagamento; comunicar à AT até 31 de janeiro; informar
   o chef do que foi comunicado; bloquear pagamentos a quem não entregar os dados após avisos.
6. **RGPD.** Dados fiscais e bancários têm base legal de obrigação legal e execução de contrato, não de
   consentimento. Conservação de 10 anos para o registo contabilístico; o direito ao apagamento não os
   abrange e a política de privacidade tem de o dizer. IBAN cifrado, nunca em logs, nunca em páginas públicas.

---

## 2. O modelo de dinheiro

Com `V` = valor da reserva (`quoted_price` se existir, senão `estimate`):

```
sinal          S = round(V × chefs.deposit_percent / 100, 2)
comissão       C = max(round(V × commission_percent / 100, 2), commission_min)
líquido        N = S − C
```

- `commission_percent` e `commission_min` vivem em `platform_settings`, nunca em código. Podem ser
  substituídos por chef (`chef_billing.commission_percent_override`, para fundadores).
- **O sinal tem de cobrir a comissão.** `deposit_percent` do chef tem de ser `>= commission_percent +
platform_settings.deposit_margin_percent` (5 por defeito). Validado no formulário do perfil e no servidor.
  Se alguma reserva antiga escapar, `C` é limitada a `S` e a reserva fica assinalada para o admin.
- `price_model = 'quote'`: só há sinal depois de o chef propor preço. Até lá não há pagamento.
- **Tudo é calculado no servidor** (`lib/money.ts` + função SQL `compute_booking_money(booking_id)`), em
  cêntimos inteiros no TypeScript e `numeric(10,2)` na base de dados. Nenhum valor vem do browser.
- Os valores ficam **congelados na reserva** no momento em que o chef aceita (snapshot): mudar a comissão
  amanhã não mexe em reservas de hoje.

## 3. O fluxo, ponta a ponta

1. **Pedido** — como hoje, sem pagamento. O resumo mostra o valor estimado e avisa que, se o chef aceitar,
   será pedido um sinal de X € pela app.
2. **Chef aceita** — `requested → accepted`. O servidor congela `V`, `S`, `C`, `N` na reserva, põe
   `deposit_status = 'due'` e `deposit_due_at = now() + 48 h` (configurável). Email ao cliente com o valor e
   o prazo.
3. **Cliente paga o sinal** na página da reserva: **MB WAY** (indica o telemóvel, aprova em 5 minutos) ou
   **referência Multibanco** (válida até ao prazo). O ecrã faz polling a um endpoint nosso, nunca à EuPago.
4. **Webhook da EuPago** confirma o pagamento → `payments.status = 'paid'` → reserva `accepted → confirmed`
   → lançamentos no livro-razão (`ledger_entries`) → mensagem de sistema e emails.
   Se o prazo passar sem pagamento: `deposit_status = 'overdue'`, o chef pode cancelar sem penalização.
5. **Jantar feito** — `confirmed → completed` (o chef marca, ou o cron 24 h depois da data, como hoje).
6. **Período de retenção** — `platform_settings.payout_hold_hours` (48 por defeito) depois de `completed`.
   Serve para disputas chegarem antes de o dinheiro sair. Findo o prazo, o pagamento ao chef fica `due`.
7. **Lote de pagamentos** — o admin abre `/admin/pagamentos`, vê o que está `due`, cria um lote
   (`payout_batches`), o sistema gera um **documento de pagamento por reserva** e um ficheiro **SEPA
   pain.001.001.09 + CSV** com os IBAN. O admin executa no banco e marca o lote como pago com a referência
   bancária. Email ao chef com o documento.
8. **O chef vê tudo** em Painel → Pagamentos: o que está retido, o que está a caminho, o que foi pago, e
   todos os documentos para descarregar.

### Cancelamentos e devoluções

| Situação                                            | Sinal                                               | Comissão                                           |
| --------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Chef cancela depois de pago o sinal                 | devolvido na totalidade                             | não cobrada                                        |
| Cliente cancela dentro da política flexível do chef | devolvido na totalidade                             | não cobrada                                        |
| Cliente cancela fora do prazo                       | regra da política do chef (`cancellation_policies`) | cobrada sobre o que ficou retido                   |
| Reserva nunca concluída, sem culpa apurada          | decisão do admin, com motivo                        | decisão do admin                                   |
| Chef não aparece                                    | devolvido na totalidade                             | não cobrada, incidente registado no perfil do chef |

- MB WAY e cartão reembolsam por API (`POST management/v1.02/refund/{trid}`, OAuth). **Referência Multibanco
  exige IBAN do cliente**: entra na fila de "devoluções manuais" do admin e o IBAN é pedido ao cliente por
  link seguro e temporário, nunca por email em texto.
- Um pagamento já incluído num lote pago não pode ser revertido automaticamente: cria-se uma **linha de
  acerto** (`ledger_entries` de tipo `adjustment`) a descontar no lote seguinte do chef, com motivo.

---

## 4. Modelo de dados

Migrações novas, numeradas a seguir à última (`20261102000001`). RLS ativa em todas. Só `service_role` e
funções `security definer` escrevem; o utilizador lê apenas o que é seu.

```
platform_settings    (id=1, payments_enabled, commission_percent, commission_min, deposit_margin_percent,
                      deposit_due_hours, payout_hold_hours, agreement_version, updated_by, updated_at)

chef_billing         (chef_id pk, entity_type ['individual','company'], legal_name, nif, vat_regime
                      ['normal','isento_art53'], address_line, postal_code, city, country default 'PT',
                      birth_date, birth_place, company_reg_number,          -- DAC7
                      iban_encrypted bytea, iban_last4, iban_bic, iban_holder,
                      iban_changed_at, payout_hold_until, iban_approved_by, iban_approved_at,
                      commission_percent_override, verified_at, created_at, updated_at)

chef_agreements      (id, chef_id, version, body_sha256, accepted_at, ip, user_agent, revoked_at)
                      -- o contrato que autoriza receber em nome dele e emitir os documentos de pagamento

bookings + colunas:  booking_value, deposit_amount, commission_amount, payout_amount,
                      commission_percent_snapshot, money_frozen_at,
                      deposit_status ['not_required','due','pending','paid','overdue','refunded','partially_refunded'],
                      deposit_due_at, deposit_paid_at, payout_due_at, payout_id

payments             (id, booking_id, kind ['deposit'], method ['mbway','multibanco','card'],
                      amount, status ['created','pending','paid','failed','expired','refunded','partially_refunded'],
                      provider 'eupago', provider_reference, provider_transaction_id, mb_entity, mb_reference,
                      mb_expires_at, phone_masked, created_at, paid_at, expires_at)
payment_events       (id, payment_id, source ['webhook','poll','admin'], type, signature_valid,
                      payload jsonb, received_at)                      -- append-only, auditoria e idempotência
refunds              (id, payment_id, amount, reason, status ['requested','manual_pending','sent','done','failed'],
                      provider_refund_id, client_iban_encrypted, requested_by, created_at, done_at)

ledger_entries       (id, booking_id, chef_id, kind ['deposit_in','commission','payout','refund','adjustment'],
                      amount, direction ['in','out'], payout_id, reason, created_by, created_at)
                      -- append-only. A soma por chef é sempre a verdade sobre quanto lhe devemos.

payout_batches       (id, reference, status ['draft','exported','paid','cancelled'], total, chef_count,
                      sepa_path, csv_path, bank_reference, created_by, created_at, exported_at, paid_at)
payouts              (id, batch_id, chef_id, amount, status ['due','batched','paid','failed','held'],
                      iban_last4_snapshot, hold_reason, created_at, paid_at)
payout_documents     (id, payout_id, booking_id, chef_id, number unique, issued_at,
                      snapshot jsonb, body_sha256, pdf_path, status ['issued','void'], void_reason,
                      acknowledged_at, acknowledged_ip, acknowledged_user_agent)

support_tickets      (id, ref unique, name, email, phone, category, booking_ref, subject, body,
                      attachments text[], status ['open','answered','closed'], assigned_to, created_at)
support_messages     (id, ticket_id, author ['person','team'], body, created_at)
```

Índices: `payments(provider_reference)`, `payments(status)`, `payment_events(payment_id)`,
`ledger_entries(chef_id, created_at)`, `payouts(chef_id, status)`, `payout_documents(number)`.

**Append-only a sério:** `revoke update, delete` em `payment_events`, `ledger_entries` e `payout_documents`
para `anon`, `authenticated` e `service_role`, mais um trigger que levanta exceção em `update`/`delete`.
Corrigir um erro é lançar uma linha nova, nunca apagar uma antiga. `payout_documents` anula-se com
`status = 'void'` e emite-se outro.

### Alterações a tabelas existentes

- `chefs`: `payouts_blocked boolean default false`, `payouts_blocked_reason`, `deposit_percent` passa a ser
  validado contra `commission_percent + deposit_margin_percent`.
- `booking_status_guard`: `accepted → confirmed` só quando `deposit_status = 'paid'` (ou por admin, com
  motivo). `completed` passa a marcar `payout_due_at = now() + payout_hold_hours`.
- Pesquisa e `getChefProfile` (`lib/data.ts`): um chef com `payouts_blocked` continua visível — o bloqueio é
  só sobre dinheiro a sair, não sobre a página.

---

## 5. Segurança

O risco número um não é a base de dados ser roubada: é **alguém mudar o IBAN de um chef e receber o
pagamento seguinte**. O plano trata o IBAN como a jóia da coroa.

- **IBAN cifrado na aplicação** (AES-256-GCM, `lib/crypto.ts`, chave em `PAYOUT_ENCRYPTION_KEY`), não no
  Postgres: uma cópia da base de dados sozinha não revela IBAN nenhum. Em claro só no ficheiro SEPA, gerado
  no momento da exportação, por um admin, com registo em `admin_logs`.
- Nas páginas e emails só aparece `••••1234` (`iban_last4`).
- **Mudar o IBAN** exige: sessão reautenticada há menos de 10 minutos, email de aviso ao endereço antigo,
  `payout_hold_until = now() + 72 h`, e o primeiro pagamento para um IBAN novo precisa de aprovação do admin.
- **Webhook** (`app/api/payments/eupago/webhook/route.ts`): ler o corpo em bruto (`await request.text()`),
  validar `X-Signature` (HMAC-SHA256) com comparação em tempo constante, decifrar AES-256-CBC com
  `X-Initialization-Vector` quando `encrypt` estiver ligado, guardar o evento **antes** de agir, e
  **confirmar sempre o estado na API da EuPago** antes de mudar o que quer que seja. Nunca confiar no valor
  que vem no corpo. Responder 200 depressa (a EuPago repete 3× de 2 em 2 minutos e depois de hora a hora
  durante 24 h — a idempotência não é opcional). Rota excluída da autenticação do `proxy.ts`, com os
  cabeçalhos de segurança mantidos.
- **Reconciliação**: cron de hora a hora sobre pagamentos `pending` com mais de 15 minutos, e cron diário
  que compara os nossos totais com `/payouts` e `/payouts-transactions` da EuPago. Divergência → email ao admin.
- Nenhum valor monetário vem do browser. Limite de tentativas nas ações de pagamento (padrão de
  `guest_lookup_attempts`). Telemóveis e IBAN mascarados em todos os logs. Segredos só em `lib/env.server.ts`.
- Documentos e ficheiros SEPA num bucket privado, servidos só por link assinado de curta duração.
- Qualquer ação de admin que mexa em dinheiro ou em visibilidade exige **motivo** e grava antes/depois em
  `admin_logs`. MFA do Supabase recomendada nas contas de admin.

---

## 6. Inscrição do chef: dados e contrato

Novo passo no registo e secção **Painel → Faturação** (`/dashboard/faturacao`), obrigatório antes de a
primeira reserva poder ser aceite:

1. **Quem és fiscalmente**: singular ou empresa, nome legal, NIF (validado com o dígito de controlo
   português), regime de IVA, morada fiscal completa. Empresas: número de registo comercial.
   Singulares: data e local de nascimento (exigidos pelo DAC7, com explicação do porquê).
2. **Onde recebes**: IBAN (validado mod-97 e comprimento PT), titular, BIC opcional.
3. **Contrato** (`chef_agreements`), aceite com uma caixa explícita e não pré-marcada, que cobre:
   - mandato para o Ao Lume **receber o sinal em nome do chef**;
   - autorização para **descontar a comissão** do sinal;
   - **consentimento para os documentos de pagamento** serem emitidos e guardados com estes dados fiscais,
     dispensando assinatura documento a documento;
   - prazo de retenção, regras de cancelamento e devolução;
   - tratamento de dados e comunicação DAC7 à AT.
     Guardamos a **versão, o SHA-256 do texto aceite, a data, o IP e o user agent**. Quando o texto mudar,
     sobe a versão e o chef volta a aceitar — sem aceitação na versão em vigor, não há pagamento.
4. Cada documento de pagamento tem na mesma um botão **"Confirmo"** no painel. Não é obrigatório (o
   contrato já cobre), mas quando o chef carrega fica `acknowledged_at` + IP + user agent: prova muito mais
   forte, por um clique.

**O documento de pagamento** (HTML → PDF, numeração própria `AL-PAG-AAAA-NNNN`, com a frase "Este documento
não é uma fatura") leva: identificação do Ao Lume; nome legal, NIF e morada do chef; referência e data da
reserva; serviço; valor da reserva; sinal recebido do cliente; percentagem e valor da comissão; valor
líquido transferido; IBAN mascarado; data da transferência e referência bancária; a versão do contrato ao
abrigo do qual é emitido; e o SHA-256 do próprio documento.

---

## 7. Admin — `/admin/pagamentos`

- **Pagamentos**: lista com filtros (estado, método, data, chef, reserva); detalhe com todos os eventos
  recebidos e se a assinatura era válida; "Verificar estado na EuPago"; "Marcar como pago à mão" (com
  comprovativo e motivo).
- **Devoluções**: total ou parcial com motivo; fila de **devoluções manuais** (Multibanco) com o fluxo de
  pedir o IBAN ao cliente por link seguro; nota do que foi devolvido e quando.
- **Cancelamentos**: painel de dinheiro por reserva — devolver sinal, manter ou perdoar comissão, lançar
  acerto, tudo com motivo. É aqui que se "reverte" o que correu mal.
- **Lotes de pagamento**: ver o que está `due`, reter um chef (`held`, com motivo), criar lote, descarregar
  **SEPA XML e CSV**, marcar como pago com a referência bancária, ver o detalhe por chef.
- **Documentos**: listar todos os documentos de pagamento, filtrar por chef e por período, **descarregar o
  PDF** (individual ou um ZIP do lote/mês), anular e reemitir com motivo.
- **Chefs**: dados fiscais, aprovar IBAN novo, comissão específica, bloquear/desbloquear pagamentos,
  exportação DAC7 do ano.
- **Definições**: percentagem e mínimo de comissão, margem do sinal, prazos, `PAYMENTS_ENABLED` em leitura.
- **Indicadores**: sinal recebido no mês, comissão, devolvido, por pagar, lotes em aberto.

## 8. Apoio — `/apoio` (público) e `/admin/apoio`

- Página pública com formulário: nome, email, telefone opcional, categoria (reserva, pagamento, conta,
  chef, outro), referência da reserva opcional, mensagem, anexos opcionais. Limite de envios por email e
  por IP, campo-armadilha anti-robô, validação com zod, `support_tickets` + email para `apoio@aolume.com`
  e resposta automática com a referência do pedido.
- A página também mostra os endereços de `lib/legal.ts` (apoio, privacidade, legal), o Livro de Reclamações
  e a morada da empresa.
- Ligações para `/apoio` no rodapé, na página da reserva, no painel do chef e nos emails transacionais.
- `/admin/apoio`: caixa de entrada com estados (aberto, respondido, fechado), notas internas, resposta por
  email a partir do painel, ligação direta à reserva ou ao chef mencionado.

## 9. Emails (`lib/email.ts`, nunca bloquear a ação se falharem)

Cliente: pedido aceite + sinal a pagar (valor, prazo, como pagar), dados da referência Multibanco, sinal
recebido e reserva confirmada, lembrete 24 h antes do prazo, devolução efetuada.
Chef: sinal recebido (reserva confirmada), jantar concluído e valor a receber com a data prevista, documento
de pagamento emitido, pagamento efetuado com referência bancária, dados fiscais em falta, IBAN alterado.
Admin: assinatura de webhook inválida, divergência na reconciliação, devolução manual pendente, lote por
executar, novo pedido de apoio.

## 10. Textos públicos

`app/termos` diz hoje que o Ao Lume não recebe nem processa pagamentos: reescrever com o sinal pago na app,
o mandato, a comissão, as devoluções, o prazo de pagamento ao chef e o apoio. `app/privacidade`: dados
fiscais e bancários, base legal, 10 anos de conservação, DAC7. `app/para-chefs`: quanto custa e quando se
recebe, sem rodeios. **Revisão jurídica antes de publicar.**

---

## 11. Fases (um ramo, um commit, um merge por fase)

0. Apagar o spec antigo, `platform_settings`, flag `PAYMENTS_ENABLED`, `lib/crypto.ts` com testes.
1. Esquema completo + RLS + append-only + `lib/money.ts` e `compute_booking_money` com testes de todos os
   limites. Sem interface.
2. Dados fiscais do chef, validação de NIF e IBAN, contrato versionado, `/dashboard/faturacao`.
3. Cliente EuPago (`lib/payments/eupago.ts` atrás de `PaymentProvider`), webhook, reconciliação, sandbox.
4. Fluxo do sinal: ecrã de pagamento MB WAY e Multibanco, polling, `StatusSteps`, prazos, emails.
5. Conclusão → retenção → lotes, documentos de pagamento, SEPA/CSV, painel do chef "Pagamentos".
6. Admin de pagamentos: devoluções, cancelamentos, acertos, documentos, lotes, definições.
7. Apoio: página pública, `support_tickets`, caixa de entrada no admin.
8. Termos, privacidade, para-chefs, exportação DAC7. Ligar a flag em produção só depois de ponta a ponta em
   sandbox.

## 12. Critérios de aceitação

- Unitários: cálculo de sinal/comissão/líquido em todos os limites, validação de NIF e IBAN, cifra e decifra,
  transições de estado, geração do SEPA, hash do documento.
- E2E (Playwright, a seguir ao teste do ciclo de reserva): pedido → chef aceita → sinal pago em sandbox →
  confirmada → concluída → retenção → lote → documento emitido e descarregado; chef cancela com devolução;
  cliente cancela fora do prazo; admin reverte um pagamento com motivo; pedido de apoio criado e respondido.
- Webhook repetido não duplica nada; webhook com assinatura inválida é rejeitado e registado.
- Nenhum valor vindo do browser é aceite; nenhum IBAN aparece em claro fora do ficheiro SEPA.
- Com `PAYMENTS_ENABLED=false` todos os testes atuais passam sem alterações.
- `npm run lint`, `npm run typecheck`, `npm run format:check` e `npm run build` limpos antes de cada merge.

## 13. Por confirmar

1. **EuPago**: split-payments com retenção até depois do jantar? Taxas por transação em MB WAY, Multibanco
   e cartão? Reembolso de referência Multibanco sem IBAN? Chaves de sandbox e produção, e configuração do
   webhook 2.0 (assinatura e cifra).
2. **Contabilista**: texto exato do documento de pagamento; IVA da comissão (23 % ao chef) e o que muda com
   chefs no art. 53.º; quando passa a ser preciso emitir fatura da comissão.
3. **Advogado**: mandato de agente comercial no contrato do chef, termos, política de devoluções.
4. Percentagem da comissão, mínimo, prazo de retenção e margem mínima do sinal (valores iniciais).
