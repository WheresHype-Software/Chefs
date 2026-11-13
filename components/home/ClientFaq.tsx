import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Faq, type FaqItem } from "@/components/ui/Faq";

/** The questions a first-time client has before asking a stranger to cook. */
export function ClientFaq({ paymentsOn = false }: { paymentsOn?: boolean }) {
  const t = useTranslations("home.faq");
  const questions: FaqItem[] = [
    [t("account.q"), t("account.a")],
    [t("cost.q"), t("cost.a")],
    [t("payment.q"), paymentsOn ? t("payment.aPaymentsOn") : t("payment.aPaymentsOff")],
    [t("chefUnavailable.q"), t("chefUnavailable.a")],
    [t("cancel.q"), t("cancel.a")],
    [t("track.q"), t.rich("track.a", { link: (c) => <Link href="/pedido">{c}</Link> })],
  ];
  return (
    <section id="perguntas" aria-labelledby="perguntas-title" className="scroll-mt-16">
      <div className="mx-auto flex max-w-[1280px] flex-wrap gap-10 px-5 py-14 md:px-8 md:py-24">
        <div className="al-rv flex flex-[1_1_280px] flex-col gap-3">
          <h2 id="perguntas-title" className="d m-0 text-[clamp(28px,3.4vw,40px)] leading-[1.05]">
            {t("title")}
          </h2>
          <p className="m-0 max-w-[36ch] text-[16px] text-muted">{t("lead")}</p>
        </div>
        <div className="al-rv min-w-0 flex-[2_1_520px]">
          <Faq items={questions} />
        </div>
      </div>
    </section>
  );
}
