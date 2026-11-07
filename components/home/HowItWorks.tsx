import { revealDelay } from "@/lib/motion";

/*
 * O terceiro passo depende de os pagamentos estarem ligados. Prometer a um cliente que paga o
 * sinal aqui, quando a app não o cobra, é a pior espécie de erro de texto: ele chega ao fim do
 * pedido à espera de um botão que não existe, e a primeira coisa que aprende sobre nós é que
 * dizemos coisas que não são verdade.
 */
const steps = (paymentsOn: boolean): [string, string][] => [
  ["Encontre quem cozinha perto", "Pesquise pela sua zona ou explore o mapa, e veja menus, preços e avaliações de quem já reservou."],
  ["Peça a reserva", "Escolha o dia livre e diga o que precisa. Não precisa de criar conta e ainda não paga nada."],
  paymentsOn
    ? [
        "Pague o sinal e está feito",
        "Quando o chef aceita, paga aqui o sinal por MB WAY ou Multibanco e a reserva fica confirmada. O resto combina com o chef, no dia.",
      ]
    : [
        "Combine com o chef e está feito",
        "Quando o chef aceita, falam pelo pedido e combinam o sinal e o pagamento entre os dois. A reserva fica confirmada assim que o chef o confirmar.",
      ],
];

/** Three steps on a cobalt band; the numbers carry the order. */
export function HowItWorks({ paymentsOn = false }: { paymentsOn?: boolean }) {
  const STEPS = steps(paymentsOn);
  return (
    <section id="como" aria-labelledby="como-title" className="scroll-mt-16 bg-cobalt text-white">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-[1fr_2fr]">
        <div className="al-rv flex flex-col gap-4">
          <h2 id="como-title" className="d m-0 text-[clamp(30px,3.6vw,44px)] leading-[1.02] text-white">
            Como funciona
          </h2>
          <p className="m-0 max-w-[34ch] text-[17px] text-[#d6e1f5]">
            O Ao Lume liga-o ao chef e organiza o pedido. O chef define o preço;{" "}
            {paymentsOn ? "o sinal é pago aqui e o resto diretamente ao chef" : "o pagamento é combinado diretamente com o chef"}.
          </p>
        </div>
        <ol className="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="al-rv flex flex-col gap-3" style={revealDelay(i)}>
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-[4px] bg-white text-[22px] font-extrabold text-cobalt"
              >
                {i + 1}
              </span>
              <h3 className="m-0 text-[19px] font-bold leading-snug">{title}</h3>
              <p className="m-0 text-[16px] leading-relaxed text-[#d6e1f5]">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
