import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { DEFAULT_LOCALE, routing } from "@/lib/i18n/routing";
import { alternates } from "@/lib/seo";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_UPDATED } from "@/lib/terms";
import { TERMS_INTRO_EN, TERMS_SECTIONS_EN, TERMS_TITLE_EN, TERMS_UPDATED_EN } from "@/lib/terms.en";

export async function generateMetadata({ params }: PageProps<"/[locale]/termos">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "legal.meta.terms" });
  return { title: t("title"), description: t("description"), alternates: alternates("/termos", locale) };
}

/**
 * The Portuguese terms (lib/terms.tsx) are the binding text, the one accepted and archived; the
 * English page shows a courtesy translation (lib/terms.en.tsx) under a notice saying so.
 */
export default async function Termos({ params }: PageProps<"/[locale]/termos">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  if (locale !== DEFAULT_LOCALE) {
    return <LegalPage path="/termos" title={TERMS_TITLE_EN} updated={TERMS_UPDATED_EN} intro={TERMS_INTRO_EN} sections={TERMS_SECTIONS_EN} />;
  }
  return <LegalPage path="/termos" title={TERMS_TITLE} updated={TERMS_UPDATED} intro={TERMS_INTRO} sections={TERMS_SECTIONS} />;
}
