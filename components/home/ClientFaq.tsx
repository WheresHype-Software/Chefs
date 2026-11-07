import Link from "next/link";
import { Faq, type FaqItem } from "@/components/ui/Faq";

const questions = (paymentsOn: boolean): FaqItem[] => [
  [
    "Preciso de criar conta?",
    "Não. Escolhe o chef, o dia e envia o pedido com o seu nome, email e telemóvel. Recebe um link para acompanhar o pedido e falar com o chef. A conta é opcional e guarda o histórico.",
  ],
  ["Quanto custa?", "O preço é o do chef e aparece no perfil antes de pedir. Enviar um pedido não custa nada."],
  [
    "Como e quando pago?",
    paymentsOn
      ? "Só depois de o chef aceitar o pedido. Nessa altura paga aqui o sinal, por MB WAY ou referência Multibanco, e a reserva fica confirmada. O restante valor combina-o diretamente com o chef, no dia."
      : "Só depois de o chef aceitar o pedido. O pagamento é combinado diretamente entre si e o chef, pelos meios que ele aceitar. Enviar o pedido não custa nada.",
  ],
  [
    "E se o chef não puder?",
    "O chef tem 48 horas para aceitar, recusar ou propor outra data ou preço. Até aceitar, não está comprometido a nada.",
  ],
  [
    "Posso cancelar?",
    "Sim, na página do pedido. Cada chef mostra a sua política de cancelamento no perfil e na reserva, para saber as condições antes de pedir.",
  ],
  [
    "Como acompanho o meu pedido?",
    <>
      Pelo link que recebe ao enviar o pedido, ou em <Link href="/pedido">Acompanhar pedido</Link> com o número do pedido e o seu email.
    </>,
  ],
];

/** The questions a first-time client has before asking a stranger to cook. */
export function ClientFaq({ paymentsOn = false }: { paymentsOn?: boolean }) {
  return (
    <section id="perguntas" aria-labelledby="perguntas-title" className="scroll-mt-16">
      <div className="mx-auto flex max-w-[1280px] flex-wrap gap-10 px-5 py-14 md:px-8 md:py-24">
        <div className="al-rv flex flex-[1_1_280px] flex-col gap-3">
          <h2 id="perguntas-title" className="d m-0 text-[clamp(28px,3.4vw,40px)] leading-[1.05]">
            Perguntas frequentes
          </h2>
          <p className="m-0 max-w-[36ch] text-[16px] text-muted">O essencial antes do primeiro pedido.</p>
        </div>
        <div className="al-rv min-w-0 flex-[2_1_520px]">
          <Faq items={questions(paymentsOn)} />
        </div>
      </div>
    </section>
  );
}
