import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Faq, type FaqItem } from "@/components/ui/Faq";
import { Compare } from "@/components/para-chefs/Compare";
import { FeeCalculator } from "@/components/para-chefs/FeeCalculator";
import { HeroStage } from "@/components/para-chefs/HeroStage";
import { MarketingTiles } from "@/components/para-chefs/MarketingTiles";
import { Promises } from "@/components/para-chefs/Promises";
import { RequestDemo } from "@/components/para-chefs/RequestDemo";
import { ToolList } from "@/components/para-chefs/ToolList";
import { ToolTabs } from "@/components/para-chefs/ToolTabs";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_DOMAIN } from "@/lib/constants";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { revealDelay } from "@/lib/motion";
import { getPublicSettings } from "@/lib/settings";
import { DEFAULT_LOCALE, routing } from "@/lib/i18n/routing";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/para-chefs">): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "paraChefs.meta" });
  const { paymentsEnabled } = await getPublicSettings();
  return {
    title: t("title"),
    description: paymentsEnabled ? t("descriptionPaymentsOn") : t("descriptionPaymentsOff"),
    alternates: alternates("/para-chefs", locale),
  };
}

const BENEFITS = ["noChasing", "noAsking", "yourMoney"] as const;
const SIGNUP_STEPS = ["account", "work", "approval", "share"] as const;

// The commission is a business setting, so the page states whatever it actually is, and is
// rebuilt hourly rather than on every visit.
export const revalidate = 3600;

export default async function ParaChefs({ params }: PageProps<"/[locale]/para-chefs">) {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);
  const t = await getTranslations("paraChefs");
  const settings = await getPublicSettings();
  const pct = locale === "pt" ? String(settings.commissionPercent).replace(".", ",") : String(settings.commissionPercent);
  const paymentsOn = settings.paymentsEnabled;
  const br = () => <br />;
  const faq: FaqItem[] = [
    [t("faq.cost.q"), paymentsOn ? t("faq.cost.aPaymentsOn", { pct }) : t("faq.cost.aPaymentsOff")],
    [t("faq.payout.q"), paymentsOn ? t("faq.payout.aPaymentsOn") : t("faq.payout.aPaymentsOff")],
    [t("faq.chefCancels.q"), paymentsOn ? t("faq.chefCancels.aPaymentsOn") : t("faq.chefCancels.aPaymentsOff")],
    [t("faq.data.q"), paymentsOn ? t("faq.data.aPaymentsOn") : t("faq.data.aPaymentsOff")],
    [t("faq.homeCook.q"), t("faq.homeCook.a")],
    [t("faq.licences.q"), t("faq.licences.a")],
    [t("faq.clientCancels.q"), t("faq.clientCancels.a")],
  ];
  return (
    <div>
      <SiteHeader chefs />

      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-14 px-5 pb-[72px] pt-[88px] md:px-10">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
          <h1 className="d al-in m-0 text-[clamp(48px,8.4vw,104px)] leading-[.94] tracking-[-0.02em]" style={{ animationDelay: "80ms" }}>
            {t.rich("hero.title", { br, accent: (c) => <span className="text-cobalt">{c}</span> })}
          </h1>
          <p className="al-in m-0 max-w-[500px] text-lg text-ink-3" style={{ animationDelay: "180ms" }}>
            {t("hero.lead")}
          </p>
          <div className="al-in" style={{ animationDelay: "220ms" }}>
            <Promises />
          </div>
          <div className="al-in flex flex-wrap gap-2.5" style={{ animationDelay: "260ms" }}>
            <Link href="/entrar?chef=1" className="btn">
              {t("createProfile")}
            </Link>
            <a href="#ferramenta" className="btn btn-o">
              {t("hero.seeTool")}
            </a>
          </div>
          <span className="al-in text-sm text-muted" style={{ animationDelay: "340ms" }}>
            {paymentsOn ? t("hero.footnotePaymentsOn") : t("hero.footnotePaymentsOff")}
          </span>
        </div>
        <HeroStage />
      </section>

      <section id="ferramenta" className="scroll-mt-16 bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="al-rv flex max-w-[760px] flex-col gap-4">
            <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">{t("tool.title")}</h2>
          </div>
          <ToolTabs />
        </div>
      </section>

      <section aria-labelledby="zona-title" className="border-y border-line bg-yolk-soft">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-9 px-5 py-14 md:px-10 md:py-20">
          <div className="al-rv flex max-w-[760px] flex-col gap-3">
            <h2 id="zona-title" className="d m-0 text-[clamp(32px,5vw,56px)] leading-none">
              {t("zone.title")}
            </h2>
            <p className="m-0 max-w-[620px] text-lg text-ink-3">{t("zone.lead")}</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-px border border-line-2 bg-line-2">
            {(["position", "reputation", "launch"] as const).map((key) => (
              <div key={key} className="flex flex-col gap-2 bg-white p-[26px]">
                <strong className="d text-[22px]">{t(`zone.${key}.title`)}</strong>
                <span className="text-[15px] text-ink-3">{t(`zone.${key}.text`)}</span>
              </div>
            ))}
          </div>
          <div className="al-rv">
            <Link href="/entrar?chef=1" className="btn">
              {t("createProfile")}
            </Link>
          </div>
        </div>
      </section>

      <section id="demo" aria-labelledby="demo-title" className="scroll-mt-16 border-y border-line bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-14 md:px-10 md:py-24">
          <div className="al-rv flex max-w-[760px] flex-col gap-3">
            <h2 id="demo-title" className="d m-0 text-[clamp(32px,5vw,56px)] leading-none">
              {t("demo.title")}
            </h2>
            <p className="m-0 text-lg text-ink-3">{t("demo.lead")}</p>
          </div>
          <RequestDemo />
        </div>
      </section>

      <Compare />

      <section
        aria-labelledby="ferramentas-title"
        className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-14 md:px-10 md:py-[120px]"
      >
        <div className="al-rv flex max-w-[760px] flex-col gap-3">
          <h2 id="ferramentas-title" className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">
            {t("tools.title")}
          </h2>
          <p className="m-0 text-lg text-ink-3">{t("tools.lead")}</p>
        </div>
        <ToolList />
      </section>

      <section id="marketing" className="scroll-mt-16 border-y border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-16 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="al-rv flex max-w-[820px] flex-col gap-[18px]">
            <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">{t("marketing.title")}</h2>
            <p className="m-0 max-w-[600px] text-lg text-ink-3">{t("marketing.lead")}</p>
          </div>
          <MarketingTiles />

          <div className="al-rv flex flex-col gap-7">
            <div className="flex flex-col gap-2.5">
              <h3 className="d m-0 text-[clamp(28px,4vw,42px)] leading-none">{t("marketing.path.title")}</h3>
              <p className="m-0 max-w-[560px] text-ink-3">{t("marketing.path.lead")}</p>
            </div>
            <ol className="m-0 grid list-none gap-px border border-line bg-line p-0 md:grid-cols-[1fr_auto_1fr]">
              <li className="flex flex-col gap-2.5 bg-paper p-7 md:p-8">
                <span className="lab text-muted">{t("marketing.path.cook.label")}</span>
                <span className="d text-[clamp(28px,4vw,36px)] leading-none">{t("marketing.path.cook.title")}</span>
                <span className="text-[15px] leading-relaxed text-ink-3">{t("marketing.path.cook.text")}</span>
              </li>
              <li aria-hidden="true" className="flex items-center justify-center bg-white px-6 py-4 md:px-5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cobalt">
                  <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" className="hidden md:block" />
                  <path d="M12 4v15m0 0 5.5-5.5M12 19l-5.5-5.5" className="md:hidden" />
                </svg>
              </li>
              <li className="flex flex-col gap-2.5 bg-white p-7 text-ink md:p-8">
                <span className="lab flex items-center gap-1.5 text-cobalt">
                  <VerifiedIcon size={15} />
                  {t("marketing.path.chef.label")}
                </span>
                <span className="d text-[clamp(28px,4vw,36px)] leading-none">{t("marketing.path.chef.title")}</span>
                <span className="text-[15px] leading-relaxed text-ink-3">{t("marketing.path.chef.text")}</span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section id="quanto-custa" className="scroll-mt-16 border-y border-line bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-12 px-5 py-14 md:px-10 md:py-[110px]">
          <div className="al-rv flex min-w-0 flex-[1_1_440px] flex-col gap-6">
            <div className="flex flex-col gap-[18px]">
              {/* A comissão é a mesma com os pagamentos ligados ou desligados: está decidida, e
                  explicá-la agora é melhor do que deixá-la para quando começar a sair da conta de
                  alguém. O que muda é o aviso em cima, que diz a quem chega hoje que ainda não paga. */}
              <span className="inline-flex w-fit items-center gap-2 bg-yolk-soft px-3 py-1.5 text-[14px] font-semibold text-ink">
                {t("pricing.badge")}
              </span>
              <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">
                {t.rich("pricing.title", { br })}
              </h2>
              {!paymentsOn && (
                <p className="m-0 max-w-[520px] border-l-[3px] border-yolk bg-yolk-soft px-4 py-3 text-[15px] text-ink">
                  {t.rich("pricing.earlyNote", { strong: (c) => <strong>{c}</strong> })}
                </p>
              )}
              <p className="m-0 max-w-[520px] text-lg text-ink-3">
                {t("pricing.text", { pct })}
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {BENEFITS.map((key, i) => (
                <li key={key} className="al-rv flex gap-3.5 border-t border-line pt-3.5" style={revealDelay(i)}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="mt-1 shrink-0 text-cobalt"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5 10 17 19 7" />
                  </svg>
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-[17px]">{t(`pricing.benefits.${key}.title`)}</strong>
                    <span className="text-[15px] text-muted">{t(`pricing.benefits.${key}.text`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="al-rv min-w-0 flex-[1_1_380px]">
            <FeeCalculator commissionPercent={settings.commissionPercent} commissionMin={settings.commissionMin} depositPercent={30} />
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <h2 className="d al-rv m-0 text-[clamp(32px,6vw,68px)] leading-none">{t("signup.title")}</h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-10 border-t border-line-2 p-0">
            {SIGNUP_STEPS.map((key, i) => (
              <li key={key} className="al-rv flex flex-col gap-2.5 border-b border-line pb-[30px] pt-[26px]">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-cobalt text-[18px] font-extrabold text-white"
                >
                  {i + 1}
                </span>
                <strong className="text-lg font-semibold">{t(`signup.steps.${key}.title`)}</strong>
                <span className="text-muted">
                  {t(`signup.steps.${key}.text`, { link: `${SITE_DOMAIN}/chef/${t("marketing.slugPlaceholder")}` })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="perguntas" className="scroll-mt-16 bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-12 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="flex-[1_1_280px]">
            <h2 className="d al-rv m-0 text-[clamp(32px,6vw,68px)] leading-none">{t("faq.title")}</h2>
          </div>
          <div className="min-w-0 flex-[2_1_520px]">
            <Faq items={faq} />
          </div>
        </div>
      </section>

      <section className="bg-cobalt-deep text-white">
        <div className="al-rv mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-5 py-20 text-center md:px-10 md:py-[120px]">
          <h2 className="d m-0 max-w-[900px] text-[clamp(42px,7vw,88px)] leading-[.98]">
            {t.rich("closing.title", { br, accent: (c) => <span className="text-yolk">{c}</span> })}
          </h2>
          <Link href="/entrar?chef=1" className="btn btn-w">
            {t("createProfile")}
          </Link>
          <div className="flex justify-center">
            <Promises tone="white" />
          </div>
        </div>
      </section>

      <SiteFooter chefs />
    </div>
  );
}
