import { useTranslations } from "next-intl";
import { revealDelay } from "@/lib/motion";

/*
 * O terceiro passo depende de os pagamentos estarem ligados. Prometer a um cliente que paga o
 * sinal aqui, quando a app não o cobra, é a pior espécie de erro de texto: ele chega ao fim do
 * pedido à espera de um botão que não existe, e a primeira coisa que aprende sobre nós é que
 * dizemos coisas que não são verdade.
 */
const steps = (paymentsOn: boolean) => ["find", "request", paymentsOn ? "payDeposit" : "agree"] as const;

/** Three steps on a cobalt band; the numbers carry the order. */
export function HowItWorks({ paymentsOn = false }: { paymentsOn?: boolean }) {
  const t = useTranslations("home.howItWorks");
  const STEPS = steps(paymentsOn).map((key) => [t(`steps.${key}.title`), t(`steps.${key}.text`)] as const);
  return (
    <section id="como" aria-labelledby="como-title" className="scroll-mt-16 bg-cobalt text-white">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-[1fr_2fr]">
        <div className="al-rv flex flex-col gap-4">
          <h2 id="como-title" className="d m-0 text-[clamp(30px,3.6vw,44px)] leading-[1.02] text-white">
            {t("title")}
          </h2>
          <p className="m-0 max-w-[34ch] text-[17px] text-[#d6e1f5]">{paymentsOn ? t("introPaymentsOn") : t("introPaymentsOff")}</p>
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
