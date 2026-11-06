# Emails que o Ao Lume envia

Todos os emails saem de `lib/email.ts`, com o mesmo desenho (`lib/email-template.ts`).
Sem `RESEND_API_KEY` configurada, nada é enviado: a mensagem é escrita no terminal do servidor.
Falhar um email nunca desfaz a ação que o originou.

Para onde vão os avisos da equipa: `ADMIN_EMAIL`, ou `verificacoes@aolume.com` se não estiver definida.

---

## Ao cliente

| Quando                                       | Assunto                                                                             | Onde                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| Envia um pedido de reserva                   | `Pedido AL-… enviado a <chef>`                                                      | `app/actions.ts`                  |
| O chef aceita e há sinal a pagar             | **`Falta o sinal · reserva AL-…`** · valor, prazo e ligação para pagar              | `lib/payments/confirm.ts`         |
| Escolhe pagar por referência Multibanco      | `Referência para o sinal · reserva AL-…` · entidade, referência, validade           | `lib/payments/confirm.ts`         |
| O sinal entra                                | `Reserva AL-… confirmada` · o que pagou e o que falta pagar ao chef                 | `lib/payments/confirm.ts`         |
| A reserva é concluída                        | `Como correu com <chef>?` · pedido de avaliação                                     | `lib/review-request.ts`           |
| Há uma devolução que não pode ser automática | `Devolução da reserva AL-…` · pede o IBAN **na página da reserva**, nunca por email | `app/admin/pagamentos/actions.ts` |

## Ao chef

| Quando                               | Assunto                                                     | Onde                               |
| ------------------------------------ | ----------------------------------------------------------- | ---------------------------------- |
| Recebe um pedido novo                | `Novo pedido AL-…`                                          | `app/actions.ts`                   |
| O cliente paga o sinal               | `Sinal recebido · reserva AL-…` · quanto vai receber        | `lib/payments/confirm.ts`          |
| O lote de pagamentos é pago no banco | `Pagamento X € · AL-…` · com o documento                    | `lib/payments/payouts.ts`          |
| Pede para mudar o IBAN               | `Confirma a alteração do teu IBAN` · ligação válida 1 hora  | `app/dashboard/actions/billing.ts` |
| A equipa aprova o perfil             | `O seu perfil Ao Lume foi aprovado`                         | `app/admin/actions.ts`             |
| A equipa pede alterações             | `O seu perfil Ao Lume precisa de alterações` · com o motivo | `app/admin/actions.ts`             |
| A equipa esconde o perfil            | `O seu perfil Ao Lume foi suspenso` · com o motivo          | `app/admin/actions.ts`             |
| O certificado é verificado           | `Já aparece como Chef no Ao Lume`                           | `app/admin/actions.ts`             |
| O certificado é recusado             | `O seu certificado no Ao Lume` · com o motivo               | `app/admin/actions.ts`             |

### Lembretes a quem ficou a meio

Enviados uma só vez por etapa e por pessoa, e só quando o cron é agendado
(`POST /api/chefs/nudge`). Cada um diz que não voltamos a insistir, e é verdade.

| Quando                                             | Assunto                                                        |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Criou conta de chef e não criou perfil (24 h)      | `Falta criar a sua página no Ao Lume`                          |
| Perfil em rascunho sem fotos ou sem menu (48 h)    | `Faltam fotografias e um menu para a sua página ficar pública` |
| Perfil completo mas por enviar para revisão (24 h) | `Está tudo pronto: falta enviar o perfil para revisão`         |

## A quem escreve para o apoio

| Quando                         | Assunto                                              | Onde                         |
| ------------------------------ | ---------------------------------------------------- | ---------------------------- |
| Envia o formulário em `/apoio` | `Recebemos a sua mensagem · AP-…` · com a referência | `lib/support.ts`             |
| A equipa responde              | `Re: <assunto> · AP-…`                               | `app/admin/apoio/actions.ts` |

## À equipa (`ADMIN_EMAIL`)

| Quando                                                 | Assunto                                     | Onde                                    |
| ------------------------------------------------------ | ------------------------------------------- | --------------------------------------- |
| Um chef envia o perfil para revisão                    | `Perfil para verificar: <nome>`             | `app/dashboard/actions/profile.ts`      |
| Um chef envia um certificado                           | `Certificado para verificar: <nome>`        | `app/dashboard/actions/certificates.ts` |
| Alguém escreve para o apoio                            | `Apoio · AP-… · <assunto>`                  | `lib/support.ts`                        |
| A EuPago diz que foi pago um valor diferente do pedido | `Pagamento com valor diferente do esperado` | `lib/payments/confirm.ts`               |

---

## O que ainda não existe

- Lembrete na véspera da reserva.
- Lembrete antes de o prazo do sinal expirar.
- Segundo pedido de avaliação a quem não avaliou.

## Quando nenhum email chega

Pela ordem em que vale a pena verificar:

1. **A chave da Resend é válida?** Uma chave inválida responde `401` a tudo e o erro fica só no log
   do servidor (`[email] Resend 401`). A administração mostra um aviso quando isto acontece.
2. **O domínio do `EMAIL_FROM` está verificado na Resend?** Enviar de um domínio que não esteja
   verificado falha na mesma. A administração compara o domínio do `EMAIL_FROM` com os que a
   Resend tem, e diz se não bate certo.
3. **`ADMIN_EMAIL` aponta para uma caixa que alguém lê?** Por omissão é `verificacoes@aolume.com`.
