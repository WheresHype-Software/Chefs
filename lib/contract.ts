import { COMPANY, EMAIL } from "./legal";

/**
 * The agreement a chef accepts before any money is collected in their name.
 *
 * It is what makes three things lawful and provable: that Ao Lume may receive the client's signal
 * on the chef's behalf, that it may keep its commission out of it, and that the payment document
 * sent with every transfer counts as agreed without being signed one by one.
 *
 * The text is hashed when accepted, so there is never a question about which words were on screen.
 * Changing a single character means bumping CONTRACT_VERSION and asking chefs to accept again —
 * `platform_settings.agreement_version` decides which version is required before a payout.
 *
 * Deliberately written without the commission figure in it: the rate lives in the settings and is
 * shown next to this text, so changing a percentage does not invalidate everyone's agreement.
 * Clause 4 is what binds that rate, and clause 10 is the notice period for changing it.
 *
 * Version 3 adds clause 2 (the money clauses only apply once paying the signal in the app is
 * switched on, announced 30 days ahead, so a chef can accept this at sign-up while payments are
 * off and switching them on is keeping the contract, not changing it), clause 11 (the food, its
 * safety and its licences are the chef's alone, and the chef answers to us for claims that come
 * from the service) and clause 12, by which both parties agree that accepting in the account is
 * the chef's signature. The checkbox only has to say "I
 * accept": the contract itself carries the agreement on form, inside the hashed text.
 *
 * For the same reason it does not name a payment interval. The hold exists and is described;
 * how often payments actually go out is an operational decision, and writing a number into a
 * contract turns a change of rhythm into a breach.
 */
export const CONTRACT_VERSION = 3;

export const CONTRACT_TITLE = "Contrato de intermediação de pagamentos";

/** The heading of the clause on electronic form, which the acceptance certificate quotes. */
export const FORM_CLAUSE_TITLE = "Forma e prova";

export function contractText(): string {
  return `${CONTRACT_TITLE}, versão ${CONTRACT_VERSION}

Entre ${COMPANY.name}, NIF ${COMPANY.nif}, com sede em ${COMPANY.address}, que explora a plataforma Ao Lume
(adiante "Ao Lume"), e o profissional que aceita este contrato na sua conta (adiante "o chef").

1. Objeto
O Ao Lume liga clientes a chefs e cozinheiros. O serviço de restauração é prestado pelo chef ao cliente;
o Ao Lume não cozinha, não contrata o chef e não é parte no contrato de prestação de serviço.

2. Âmbito e início
As cláusulas 3 a 8 aplicam-se apenas às reservas cujo sinal seja pago através da plataforma, e só a partir
do momento em que essa funcionalidade esteja ativa. Enquanto não estiver, o Ao Lume não recebe pagamentos
em nome do chef nem cobra comissão, e o preço do serviço é combinado e pago diretamente entre o cliente e o
chef. A ativação é comunicada ao chef por email com pelo menos 30 dias de antecedência, indicando a taxa de
comissão em vigor. As restantes cláusulas aplicam-se desde a aceitação.

3. Mandato para receber o sinal
O chef autoriza expressamente o Ao Lume a receber, em seu nome e por sua conta, o sinal pago pelo cliente
através da plataforma. O Ao Lume atua como mandatário do chef para esse efeito e apenas para esse efeito.
O restante preço do serviço é combinado e pago diretamente entre o cliente e o chef, fora da plataforma.

4. Comissão
O Ao Lume cobra uma comissão sobre o valor total da reserva, à taxa em vigor publicada no painel do chef
no momento em que o chef aceita cada pedido. O chef autoriza o Ao Lume a deduzir essa comissão ao sinal
recebido. O valor da comissão fica fixado no momento em que o chef aceita o pedido e não é alterado
depois disso, mesmo que a taxa mude entretanto.

5. Pagamento ao chef
Concluído o serviço, o Ao Lume transfere ao chef o sinal recebido deduzido da comissão, para o IBAN
registado na conta do chef. Entre a conclusão do serviço e o pagamento existe um período de retenção,
para que eventuais reclamações do cliente cheguem antes de o dinheiro sair. Os pagamentos são feitos
periodicamente; o chef vê a qualquer momento, no seu painel, quanto tem a receber e em que estado está
cada valor.

6. Documento de pagamento
Com cada pagamento, o Ao Lume emite e envia ao chef um documento que identifica o chef (nome legal, NIF e
morada fiscal), a reserva, o valor do serviço, o sinal recebido, a comissão deduzida e o valor transferido.
O chef declara conhecer e aceitar o conteúdo destes documentos ao abrigo deste contrato, dispensando
assinatura documento a documento, e obriga-se a comunicar ao Ao Lume qualquer erro no prazo de 15 dias.
Este documento não é uma fatura e não dispensa as obrigações fiscais do chef perante o cliente nem a
emissão de fatura pelo chef quando devida.

7. Obrigações fiscais do chef
O chef declara ter atividade aberta junto da Autoridade Tributária, manter atualizados os seus dados
fiscais no painel e cumprir as suas obrigações de faturação e de IVA. A comissão do Ao Lume é faturada ao
chef nos termos da lei.

8. Cancelamentos e devoluções
As regras de cancelamento e de devolução do sinal são as publicadas na plataforma e as definidas pelo
chef na sua política de cancelamento. Quando o sinal é devolvido ao cliente por facto não imputável ao
chef, a comissão correspondente não é cobrada. Quando é o chef a cancelar depois de aceitar, o sinal é
integralmente devolvido ao cliente.

9. Dados pessoais
Os dados fiscais e bancários do chef são tratados para execução deste contrato e para cumprimento de
obrigações legais, conservados pelo prazo legal de dez anos, e não são usados para outro fim. O Ao Lume
está obrigado a comunicar anualmente à Autoridade Tributária os dados e os montantes previstos no
Decreto-Lei n.º 20/2022 (DAC7), e informa o chef do que foi comunicado. O chef pode exercer os seus
direitos em ${EMAIL.privacy}.

10. Alterações e vigência
Este contrato é válido por tempo indeterminado. Alterações à taxa de comissão ou a este texto são
comunicadas com pelo menos 30 dias de antecedência e exigem nova aceitação; até lá valem as condições
aceites. O chef pode cessar o contrato a qualquer momento, ficando o Ao Lume obrigado a pagar o que já
tiver recebido em seu nome.

11. Responsabilidade do chef
O chef presta o serviço por conta própria e é o único responsável pela preparação, conservação, transporte e
serviço dos alimentos, pelo cumprimento das regras de higiene e segurança alimentar (Regulamento (CE)
n.º 852/2004 e princípios HACCP), pela informação sobre alergénios prestada ao cliente (Regulamento (UE)
n.º 1169/2011) e pelas licenças, registos e seguros exigidos para a sua atividade. O chef obriga-se a
indemnizar o Ao Lume por reclamações, coimas ou danos que resultem do serviço que presta, salvo quando
causados por facto imputável ao Ao Lume. Nada nesta cláusula limita a responsabilidade de qualquer das
partes nos casos em que a lei não o permite.

12. ${FORM_CLAUSE_TITLE}
As partes convencionam que este contrato é celebrado por via eletrónica e que a aceitação do chef na sua
conta, registada com data, hora e dados da sessão, vale como a sua assinatura, em substituição de assinatura
manuscrita, e faz prova da celebração e do conteúdo do contrato aceite. O Ao Lume conserva o texto aceite e
envia ao chef, por email, a indicação da versão aceite com ligação para o texto integral, que o chef pode
guardar e imprimir.

13. Lei aplicável
Aplica-se a lei portuguesa. Para qualquer litígio é competente o foro da comarca de Lisboa, sem prejuízo
do recurso à resolução alternativa de litígios e ao Livro de Reclamações.

Contacto: ${EMAIL.support}`;
}

/** The points worth reading before the long text, for the summary box above it. */
export const CONTRACT_HIGHLIGHTS = [
  "Autoriza o Ao Lume a receber o sinal do cliente em seu nome.",
  "A comissão é descontada ao sinal; o restante é-lhe transferido depois do serviço.",
  "Cada pagamento vem com um documento com os seus dados fiscais, que fica aceite por este contrato.",
  "Se cancelar depois de aceitar um pedido, o sinal volta inteiro para o cliente.",
  "É o único responsável pela segurança alimentar, pelos alergénios e pelas licenças do seu serviço.",
  "Os seus dados fiscais são comunicados à Autoridade Tributária uma vez por ano (DAC7).",
] as const;
