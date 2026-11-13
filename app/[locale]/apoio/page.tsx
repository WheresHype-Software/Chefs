import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicSettings } from "@/lib/settings";
import { Link } from "@/lib/i18n/navigation";
import { DEFAULT_LOCALE, routing } from "@/lib/i18n/routing";
import { alternates } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SupportForm } from "@/components/SupportForm";
import { COMPANY, COMPLAINTS_BOOK_URL, EMAIL } from "@/lib/legal";

export async function generateMetadata({ params }: PageProps<"/[locale]/apoio">): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "support.meta" });
  return { title: t("title"), description: t("description"), alternates: alternates("/apoio", locale) };
}

const CONTACTS = [
  { key: "support", address: EMAIL.support },
  { key: "privacy", address: EMAIL.privacy },
  { key: "legal", address: EMAIL.legal },
] as const;

export default async function ApoioPage({ params }: PageProps<"/[locale]/apoio">) {
  const { locale: raw } = await params;
  if (hasLocale(routing.locales, raw)) setRequestLocale(raw);
  const t = await getTranslations("support");
  const { paymentsEnabled: paymentsOn } = await getPublicSettings();
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[920px] flex-1 flex-col gap-8 px-5 pb-20 pt-10 md:px-8 md:pt-14">
        <div className="flex flex-col gap-3">
          <h1 className="d m-0 text-[clamp(32px,5vw,48px)] leading-[1.05]">{t("page.title")}</h1>
          <p className="m-0 max-w-[62ch] text-muted">{t("page.lead")}</p>
        </div>

        <SupportForm />

        <section className="flex flex-col gap-4">
          <h2 className="d m-0 text-[28px]">{t("paymentsFaq.title")}</h2>
          <dl className="m-0 flex flex-col gap-4">
            {/* Enquanto a app não cobrar nada, estas respostas descreviam um caminho que não
                existe: um cliente lia-as, esperava um email com o valor, e nunca o recebia. */}
            {paymentsOn ? (
              <>
                <div>
                  <dt className="m-0 font-semibold">{t("paymentsFaq.whenDeposit.q")}</dt>
                  <dd className="m-0 text-muted">{t("paymentsFaq.whenDeposit.a")}</dd>
                </div>
                <div>
                  <dt className="m-0 font-semibold">{t("paymentsFaq.rest.q")}</dt>
                  <dd className="m-0 text-muted">{t("paymentsFaq.rest.a")}</dd>
                </div>
                <div>
                  <dt className="m-0 font-semibold">{t("paymentsFaq.refund.q")}</dt>
                  <dd className="m-0 text-muted">{t("paymentsFaq.refund.a")}</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="m-0 font-semibold">{t("paymentsFaq.howToPay.q")}</dt>
                  <dd className="m-0 text-muted">{t("paymentsFaq.howToPay.a")}</dd>
                </div>
                <div>
                  <dt className="m-0 font-semibold">{t("paymentsFaq.chefCancelled.q")}</dt>
                  <dd className="m-0 text-muted">{t("paymentsFaq.chefCancelled.a")}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="m-0 font-semibold">{t("paymentsFaq.ibanScam.q")}</dt>
              <dd className="m-0 text-muted">
                {t.rich("paymentsFaq.ibanScam.a", {
                  email: EMAIL.support,
                  mail: (c) => <a href={`mailto:${EMAIL.support}`}>{c}</a>,
                })}
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="d m-0 text-[22px]">{t("contacts.title")}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {CONTACTS.map((c) => (
              <li key={c.address} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="lab text-muted">{t(`contacts.${c.key}.label`)}</span>
                <a href={`mailto:${c.address}`}>{c.address}</a>
                <span className="text-muted">· {t(`contacts.${c.key}.what`)}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm text-muted">{t("contacts.company", { name: COMPANY.name, nif: COMPANY.nif, address: COMPANY.address })}</p>
          <p className="m-0 text-sm text-muted">
            {t.rich("contacts.more", {
              book: (c) => (
                <a href={COMPLAINTS_BOOK_URL} target="_blank" rel="noopener noreferrer">
                  {c}
                </a>
              ),
              terms: (c) => <Link href="/termos">{c}</Link>,
              privacy: (c) => <Link href="/privacidade">{c}</Link>,
            })}
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
