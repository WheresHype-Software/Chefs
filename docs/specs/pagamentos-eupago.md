# Pagamentos com a Eupago: taxa de reserva, sinal do chef e faturação

Especificação para implementar. Lê-a toda antes de começar.

## 0. Contexto e regras do repositório

- Next.js 16 (App Router, `proxy.ts`, server actions), React 19, Supabase (RLS, funções `security definer`), zod 4, Tailwind 4.
  Esta versão do Next tem mudanças face ao que conheces: lê o guia relevante em `node_modules/next/dist/docs/` antes de escrever código (ver `AGENTS.md`).
- Convenções já usadas: `failWith` / `failInvalid` em `lib/result.ts`, `callAction` no cliente, `sendEmail` em `lib/email.ts`,
  transições de reserva controladas pelo trigger `booking_status_guard` (migração `20261027000003_functions.sql`),
  `admin_logs` para auditoria, crons em `pg_cron` (migração `20261027000004_storage_cron.sql`).
- Texto da interface em português de Portugal, tratamento por "tu" no lado do chef e "você" onde o site já o usa para clientes (segue o que existe).
- Commits por funcionalidade, um ramo por fase, merge para `main` e push no fim de cada fase. Nunca misturar fases num commit.
- Tudo atrás de uma flag: `PAYMENTS_ENABLED` (env). Com a flag desligada o site comporta-se exatamente como hoje.

## 1. O modelo de negócio (o que estamos a construir)

1. **Taxa de reserva**: valor fixo por regra (secção 2), cobrado pela plataforma via Eupago (MB WAY ou referência Multibanco).
   Por defeito é **pago pelo cliente no momento do pedido**. O pedido só chega ao chef depois de pago.
2. **O chef recebe 100 % do valor do serviço**, pago diretamente pelo cliente (fora da plataforma), como hoje.
3. **Sinal do chef** (opcional, `chefs.deposit_percent`): pago pelo cliente **diretamente ao chef** (MB WAY/IBAN do chef),
   depois de o chef aceitar. A plataforma nunca recebe dinheiro do chef nem em nome do chef.
4. **Faturação ao chef** (mensal): para taxas cujo pagador é o chef (configurável, secção 3) e para acertos.
   Se a fatura não for paga no prazo, a página do chef fica **oculta** (não aparece em pesquisas nem aceita pedidos novos)
   até ser paga.
5. **O admin pode corrigir tudo**: valores de taxas, regras, faturas mensais, prazos, estados de pagamento e visibilidade,
   sempre com motivo registado.

> Nota legal: a plataforma só recebe dinheiro que é seu (taxas). Não implementar nada em que o dinheiro do serviço ou do sinal
> passe pela conta da plataforma. Isso exigiria licença de instituição de pagamento.

## 2. Tabela de taxas (valores iniciais, editáveis pelo admin)

Todos os valores **com IVA incluído**. Guardar em base de dados (`fee_rules`), nunca em código.

| Categoria | Como se identifica | Taxa |
|---|---|---|
| `home` (chef em casa) | `fulfilment_mode = 'home'` e a oferta não tem `events` em `service_types` | 1,00 € × `guests`, mínimo 3,00 € |
| `events` | `fulfilment_mode = 'home'` e `'events' = any(service_types)` | 10,00 € se `guests <= 30`, 15,00 € se `guests > 30` |
| `orders` (bolos, salgados, doces) | `fulfilment_mode in ('delivery','pickup')` e a oferta não tem `meal_prep` | por valor estimado da encomenda: ≤ 25 € → 1,00 €; ≤ 75 € → 2,00 €; > 75 € → 3,00 € |
| `meal_prep` (marmitas) | `'meal_prep' = any(service_types)` | 1,50 € por pedido |

- O valor estimado da encomenda é `bookings.estimate` (calculado no servidor a partir da oferta, como já acontece). Para `price_model = 'quote'`, usar o escalão mínimo da categoria e permitir ao admin corrigir.
- Promoções: suporte a "primeira reserva do cliente sem taxa" (regra ativável pelo admin, por email/cliente). Quando a taxa é 0, salta o passo de pagamento.
- Fundadores: campo `chefs.fee_discount_percent` (0–100) e/ou `chefs.fee_exempt_until` (data). Aplica-se a taxas pagas pelo chef. Para taxas pagas pelo cliente, ver `fee_rules.client_promo`.
- **O cálculo é sempre feito no servidor** (função SQL `compute_booking_fee(booking_id)` ou módulo TS `lib/fees.ts` partilhado com o SQL através de uma única fonte). Nunca aceitar um valor de taxa vindo do browser.
- Testes unitários para cada linha da tabela e para os limites (25 €, 75 €, 30 pessoas, mínimo 3 €).

## 3. Quem paga a taxa

- `platform_settings.fee_payer_default`: `'client'` (por defeito) ou `'chef'`.
- `chefs.fee_payer`: `null` (usa o defeito) | `'client'` | `'chef'`. O admin pode mudar por chef.
- Pagador **cliente** → passo de pagamento na reserva (secção 5).
- Pagador **chef** → a reserva segue sem pagamento; quando a reserva fica `completed`, cria-se uma linha de taxa a cobrar ao chef na fatura mensal (secção 7).
- O valor e o pagador ficam **congelados na reserva** no momento do pedido (snapshot), para alterações de regras não mexerem em reservas antigas.

## 4. Modelo de dados (migrações novas, numeradas a seguir à última existente)

Criar com RLS ativa em todas as tabelas. Só o `service_role` (servidor) escreve em tabelas de pagamentos; utilizadores só leem o que é seu.

```
platform_settings      (id = 1, fee_payer_default, payments_enabled, statement_due_days default 20, updated_at)
fee_rules              (id, category, kind ['per_guest','tiered','flat'], params jsonb, min_amount, active, valid_from, valid_to, updated_by, updated_at)

bookings  + colunas:   fee_amount numeric(10,2), fee_payer text, fee_category text, fee_rule_id,
                        fee_status ['not_required','pending','paid','refunded','waived','billed_to_chef'],
                        deposit_amount numeric(10,2), deposit_status ['not_required','due','received','overdue'],
                        deposit_due_at timestamptz, deposit_received_at timestamptz

booking_status enum    + 'pending_payment'  (pedido criado mas ainda invisível para o chef)

payments               (id, kind ['booking_fee','statement'], booking_id null, statement_id null,
                        method ['mbway','multibanco'], amount, status ['created','pending','paid','failed','expired','refunded','partially_refunded'],
                        provider 'eupago', provider_reference, provider_transaction_id,
                        mb_entity, mb_reference, mb_expires_at, mbway_phone_masked,
                        raw_last_event jsonb, created_at, paid_at, refunded_at)
payment_events         (id, payment_id, type, payload jsonb, received_at)   -- todos os callbacks recebidos, para auditoria e idempotência

chef_payout_details    (chef_id pk, mbway_phone, iban, holder_name, updated_at)
                        -- só o próprio chef e o admin leem; o cliente só recebe estes dados via RPC depois de o chef aceitar

chef_fee_lines         (id, chef_id, booking_id null, description, amount, kind ['booking_fee','adjustment','credit'],
                        period date (1.º dia do mês), statement_id null, created_by ['system','admin'], reason, created_at)
chef_statements        (id, chef_id, period date, total, status ['draft','issued','paid','overdue','void','waived'],
                        issued_at, due_at, paid_at, invoice_id null, created_at)
invoices               (id, kind ['client_fee','chef_statement','credit_note'], booking_id null, statement_id null,
                        provider ['manual','moloni','invoicexpress','vendus'], provider_document_id, number, pdf_url,
                        status ['pending','issued','failed'], amount, issued_at, related_invoice_id null)

chefs  + colunas:      fee_payer, fee_discount_percent, fee_exempt_until, billing_hold boolean default false,
                        billing_hold_since timestamptz, billing_hold_reason text
```

- Índices em `payments(provider_reference)`, `payments(status)`, `chef_statements(chef_id, period)` (único), `chef_fee_lines(chef_id, period)`.
- `billing_hold = true` tem de entrar nas funções de pesquisa existentes (pesquisa por zona, por data e páginas de cidade) e em `getChefProfile` (ver `lib/data.ts`): o chef desaparece das listagens e a página mostra "Este chef não está a aceitar pedidos de momento". O formulário de reserva fica desativado e o servidor recusa pedidos novos.
- Atualizar `booking_status_guard`:
  - `pending_payment → requested` só por `system` (webhook) ou `admin`.
  - `pending_payment → cancelled|expired` por `client`, `system`, `admin`.
  - O chef não vê nem altera reservas `pending_payment` (atualizar RLS e todas as consultas do painel).
  - `accepted → confirmed`: se `deposit_amount > 0`, só quando `deposit_status = 'received'` (o chef marca) ou por admin.

## 5. Fluxo do cliente: pedido com taxa de reserva

1. O cliente preenche o formulário como hoje. O resumo mostra: valor estimado do serviço, **taxa de reserva** (com explicação curta: "Garante o teu pedido. O pagamento do serviço é feito diretamente ao chef.") e, se o chef pedir, o sinal previsto.
2. Ao enviar, o servidor cria a reserva em `pending_payment` com `fee_*` calculado e devolve o ecrã de pagamento:
   - **MB WAY**: o cliente indica o telemóvel; o servidor cria o pedido MB WAY na Eupago; o ecrã mostra "Aprova o pagamento na app MB WAY" com contagem decrescente do prazo da Eupago e verificação de estado (polling a um endpoint nosso, nunca à Eupago a partir do browser).
   - **Referência Multibanco**: o servidor gera a referência com validade (ex.: 24 h); o ecrã e o email mostram entidade, referência e valor.
3. Callback da Eupago (secção 8) marca o pagamento `paid` → reserva `pending_payment → requested`, `fee_status = 'paid'` → só agora o chef é notificado (email + painel), exatamente como hoje.
4. Expiração: cron de 5 em 5 minutos passa `pending_payment` com pagamento expirado para `expired` e liberta o dia no calendário. O cliente pode tentar pagar de novo a partir da página da reserva enquanto não expirar.
5. Fatura da taxa ao cliente: emitida pelo fornecedor de faturação (secção 9) depois do pagamento, enviada por email e disponível na página da reserva.
6. Página da reserva / `StatusSteps`: acrescentar o passo "Pagamento da taxa" antes de "Pedido enviado", e no fim o passo "Sinal" quando aplicável.

### Devoluções da taxa (automáticas, via API de reembolso da Eupago)
| Situação | Taxa |
|---|---|
| Chef recusa (`declined`) | devolvida |
| Pedido expira sem resposta do chef (`expired` a partir de `requested`) | devolvida |
| Chef cancela depois de aceitar | devolvida + registo no perfil do chef (contador para o admin) |
| Cliente cancela | não devolvida |
| Admin decide | devolução total ou parcial, com motivo |

- Se o método não permitir reembolso automático (ex.: referência Multibanco), criar tarefa de devolução manual no admin com os dados necessários (IBAN pedido ao cliente por email com link seguro). Confirmar na documentação da Eupago o que é suportado.
- Cada devolução emite **nota de crédito** pelo fornecedor de faturação (nunca editar uma fatura emitida).

## 6. Fluxo do sinal (pago ao chef)

1. O chef define `deposit_percent` (já existe) e os seus dados em **Painel → Pagamentos** (`chef_payout_details`: MB WAY e/ou IBAN, titular). Validar IBAN português (formato e dígitos de controlo) e telemóvel.
2. Quando o chef aceita uma reserva com sinal: `deposit_amount = round(valor_estimado × deposit_percent / 100, 2)`, `deposit_status = 'due'`, `deposit_due_at = now() + 48 h` (configurável).
3. O cliente vê, na página da reserva e no email de aceitação: valor do sinal, prazo e os dados de pagamento do chef (via RPC que só devolve estes dados ao cliente dessa reserva e só depois de `accepted`).
4. O chef marca **"Sinal recebido"** → `deposit_status = 'received'` → reserva `accepted → confirmed` (mensagem de sistema e email ao cliente).
5. Se passar o prazo: `deposit_status = 'overdue'`; o chef pode cancelar sem penalização (o cancelamento por esta razão não conta como cancelamento do chef e a taxa **não** é devolvida ao cliente). Lembrete automático ao cliente 24 h antes do prazo.
6. Sem sinal (`deposit_percent` nulo ou 0): o comportamento atual mantém-se.

## 7. Faturação mensal ao chef e ocultação

Aplica-se a linhas de `chef_fee_lines` (taxas com pagador chef e acertos do admin).

1. **Criação das linhas**: quando uma reserva com `fee_payer = 'chef'` passa a `completed`, criar uma linha `booking_fee` no mês da data da reserva, aplicando `fee_discount_percent` / `fee_exempt_until`.
2. **Fecho do mês** (cron no dia 1 às 03:00, Europe/Lisbon): para cada chef com linhas do mês anterior, criar `chef_statements` (`draft`), somar, ignorar totais de 0 €.
3. **Emissão**: `draft → issued` (automático logo a seguir, ou manual se o admin ativar "rever antes de emitir" em `platform_settings`). Emite a fatura no fornecedor, gera **referência Multibanco** (validade até ao prazo) e permite **MB WAY** a partir do painel. Email ao chef com o PDF, o total, o prazo e os dados de pagamento.
4. **Prazo**: `due_at = issued_at + statement_due_days` (20 por defeito). Lembretes por email no dia 10 e no dia 15 depois da emissão, e no dia do prazo.
5. **Atraso**: cron diário; se `now() > due_at` e não paga → `overdue`, `chefs.billing_hold = true`, `billing_hold_reason = 'statement_overdue'`, email ao chef a explicar que a página está oculta e como reativar.
   - Reservas já aceites ou confirmadas **mantêm-se** (não prejudicar clientes).
   - Pedidos novos são recusados no servidor; a página não aparece nas pesquisas.
6. **Pagamento**: callback da Eupago → `paid` → se não houver outras faturas em atraso, `billing_hold = false` de imediato (mensagem no painel e email).
7. **Painel do chef → Faturação**: linhas do mês corrente (o que vai ser faturado), faturas anteriores com estado e PDF, botão "Pagar" (MB WAY ou referência), aviso destacado quando há fatura em atraso ou a página está oculta.

## 8. Integração Eupago

- **Não inventar endpoints.** Seguir a documentação oficial da Eupago (API REST: MB WAY, referências Multibanco, estado de pagamento, reembolsos e callbacks/notificações). Pedir ao dono do projeto acesso ao ambiente de testes (sandbox) e às chaves.
- Variáveis de ambiente (só no servidor, validadas em `lib/env.server.ts`): `EUPAGO_API_KEY`, `EUPAGO_ENV` (`sandbox` | `production`), `EUPAGO_CALLBACK_SECRET` (ou o mecanismo de validação que a Eupago documentar), `PAYMENTS_ENABLED`, `INVOICING_PROVIDER` e respetivas credenciais.
- Módulo `lib/payments/eupago.ts` com funções pequenas e tipadas (zod nas respostas): `createMbwayPayment`, `createMultibancoReference`, `getPaymentStatus`, `refundPayment`. Timeouts e tratamento de erros com `failWith`; nunca expor erros técnicos ao utilizador.
- Interface `PaymentProvider` para não acoplar o resto da app à Eupago.
- **Callback**: route handler `app/api/payments/eupago/callback/route.ts`.
  - Validar a autenticidade do pedido como a Eupago indicar (chave/assinatura, e, por segurança, **confirmar sempre o estado através de `getPaymentStatus`** antes de mudar qualquer estado).
  - Idempotente: guardar cada evento em `payment_events`; ignorar eventos repetidos; transições só para a frente.
  - Responder rápido (200) e fazer o trabalho de forma segura dentro da transação.
  - Excluir a rota do `proxy.ts` de autenticação se necessário, mantendo os cabeçalhos de segurança.
- Reconciliação: cron de hora a hora que consulta pagamentos `pending` com mais de 15 min e atualiza o estado (cobre callbacks perdidos).
- Valores sempre em cêntimos inteiros no código TS; `numeric(10,2)` na base de dados.

## 9. Faturação (programa certificado)

- Em Portugal as faturas têm de sair de um programa certificado pela AT. **A app não numera faturas.**
- Interface `InvoicingProvider` com `issueInvoice`, `issueCreditNote`, `getPdf`. Primeira implementação: `manual` (fica `pending` e o admin regista número e PDF à mão). Depois, o fornecedor que o dono escolher (Moloni, InvoiceXpress ou Vendus, que já integra com a Eupago).
- Dados fiscais: cliente pode indicar NIF opcional no pagamento da taxa (consumidor final por defeito); chef deve ter NIF e morada fiscal no perfil para receber faturas (pedir no painel antes da primeira fatura). Ver também a nota DAC7 nos termos (`app/termos`).
- Taxas de IVA e textos fiscais configuráveis; confirmar com o contabilista antes de ativar em produção.

## 10. Admin (`/admin/pagamentos`)

Tudo o que muda dinheiro ou visibilidade exige **motivo** e fica em `admin_logs` (quem, quando, antes, depois).

- **Regras de taxa**: listar, editar valores e escalões, ativar/desativar, datas de validade. Pré-visualização: "uma reserva de 6 pessoas em casa pagaria X".
- **Definições**: pagador por defeito, prazo das faturas, "rever antes de emitir", promoção de primeira reserva, `PAYMENTS_ENABLED` mostrado só como leitura.
- **Reservas**: ver taxa, pagador, estado do pagamento e do sinal; **corrigir a taxa** (antes de paga: muda o valor; depois de paga: devolução parcial/total ou linha de acerto); **perdoar** taxa; marcar pagamento como pago manualmente (com referência do comprovativo); forçar `pending_payment → requested` em casos excecionais.
- **Pagamentos**: lista com filtros (estado, método, data), detalhe com todos os eventos recebidos, botão "Verificar estado na Eupago", "Reembolsar".
- **Faturas mensais dos chefs**: ver, editar linhas enquanto `draft`, adicionar acertos/créditos, emitir, **prorrogar prazo**, marcar como paga, anular (com nota de crédito), perdoar.
- **Chefs**: mudar `fee_payer`, desconto de fundador, isenção até data, **ocultar/mostrar manualmente** (`billing_hold`) com motivo.
- **Devoluções manuais pendentes** (Multibanco).
- Indicadores simples: taxas cobradas no mês, devolvidas, faturas em atraso, chefs ocultos.

## 11. Emails (via `lib/email.ts`, nunca bloquear a ação se o email falhar)

Cliente: dados de pagamento da taxa (Multibanco), taxa paga e pedido enviado, devolução da taxa, pedido aceite + sinal a pagar, lembrete do sinal, reserva confirmada.
Chef: novo pedido (só depois de pago), lembrete para marcar sinal recebido, fatura emitida, lembretes, página oculta, página reativada.
Admin: callback com erro de validação, devolução manual pendente, fatura com falha de emissão.

## 12. Segurança

- Nenhum valor monetário vem do browser; tudo recalculado no servidor.
- RLS: o chef nunca vê pagamentos de clientes nem dados de outros chefs; o cliente só vê os dados de pagamento do chef da sua reserva aceite; `chef_payout_details` nunca aparece em páginas públicas.
- Callback validado e confirmado na API; rate limit nas ações de pagamento (reutilizar o padrão de `guest_lookup_attempts`).
- Telemóveis e IBAN mascarados nos logs. Sem chaves no cliente.
- Ações de admin só com `is_admin()` verificado no servidor.

## 13. Termos e textos públicos

- `app/termos` diz hoje "O Ao Lume não recebe nem processa pagamentos" e que é gratuito no lançamento: atualizar para a taxa de reserva, regras de devolução, sinal pago ao chef, faturação mensal e ocultação por falta de pagamento. **Revisão jurídica antes de publicar.**
- Página "Como funciona" e página "Para chefs": explicar a taxa ao cliente e "recebes 100 % do valor do serviço" ao chef.

## 14. Fases (um ramo e um merge por fase)

1. Esquema, `fee_rules`, `lib/fees.ts` + testes, flag. (sem UI)
2. Cliente Eupago, callback, reconciliação, `payment_events`. Testes com sandbox.
3. Fluxo de reserva com taxa paga pelo cliente + expiração + devoluções + `StatusSteps`.
4. Sinal pago ao chef + dados de pagamento do chef.
5. Faturação mensal ao chef + ocultação + painel "Faturação".
6. Admin de pagamentos e correções.
7. Fornecedor de faturação (manual primeiro, depois o escolhido).
8. Termos, textos e emails finais. Ligar a flag em produção só depois de testes completos em sandbox.

## 15. Testes e critérios de aceitação

- Unitários: cálculo de taxas (todas as regras e limites), transições de estado, cálculo do sinal, fecho do mês, ocultação.
- E2E (Playwright, já existe um teste do ciclo de reserva): pedido → pagamento MB WAY simulado → chef vê → aceita → sinal → confirmado → concluído; pedido recusado com devolução; fatura mensal em atraso oculta o chef e o pagamento reativa-o; admin corrige uma taxa.
- Callback repetido não duplica nada; callback falso é rejeitado.
- Com `PAYMENTS_ENABLED=false` todos os testes atuais continuam a passar sem alterações.
- `npm run lint`, typecheck e build sem erros antes de cada merge.

## 16. Perguntas em aberto (confirmar com o dono antes da fase correspondente)

1. A Eupago faz reembolsos automáticos em MB WAY e Multibanco? Que taxas cobra por transação? (afeta mínimos da secção 2)
2. Pagador por defeito: cliente (recomendado) ou chef?
3. Que programa de faturação certificado vai ser usado?
4. Valores com IVA incluído confirmados pelo contabilista?
5. Vantagem exata dos chefs fundadores (desconto/isenção e duração).
