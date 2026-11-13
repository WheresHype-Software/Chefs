import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { CourtesyNotice } from "@/components/LegalPage";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { reflow } from "@/lib/acceptance-format";
import { CONTRACT_TITLE, contractText } from "@/lib/contract";
import { CONTRACT_TITLE_EN, contractTextEn } from "@/lib/contract.en";
import { DEFAULT_LOCALE, routing } from "@/lib/i18n/routing";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/contrato-chefs">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "legal.meta.contract" });
  return { title: t("title"), description: t("description"), alternates: alternates("/contrato-chefs", locale) };
}

/**
 * The chef contract in full, where the sign-up checkbox links to. The same text, character for
 * character, is what gets hashed and archived when a chef accepts it. In English the page shows a
 * courtesy translation (lib/contract.en.ts), which is never hashed: the Portuguese text binds.
 */
export default async function ContratoChefs({ params }: PageProps<"/[locale]/contrato-chefs">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  const t = await getTranslations("legal.contract");
  const portuguese = locale === DEFAULT_LOCALE;
  return (
    <div>
      <SiteHeader chefs />
      <main className="mx-auto flex max-w-[760px] flex-col gap-8 px-5 py-14 text-[16px] leading-relaxed text-ink-3 md:px-8 md:py-16">
        <CourtesyNotice path="/contrato-chefs" />
        <header className="flex flex-col gap-3">
          <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none text-ink">{portuguese ? CONTRACT_TITLE : CONTRACT_TITLE_EN}</h1>
          <p className="m-0 text-[17px]">{t.rich("intro", { terms: (c) => <Link href="/termos">{c}</Link> })}</p>
        </header>

        <pre className="m-0 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink-3">
          {/* The first line repeats the title above, with the version: it stays in the text that is
              hashed and archived, and leaves the page, where the heading already says it. */}
          {reflow(portuguese ? contractText() : contractTextEn()).replace(/^[^\n]*\n+/, "")}
        </pre>
      </main>
      <SiteFooter />
    </div>
  );
}
