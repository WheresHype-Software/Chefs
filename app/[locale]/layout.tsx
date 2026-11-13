import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { publicEnv } from "@/lib/env";
import "../globals.css";
import { CookieBanner } from "@/components/analytics/CookieBanner";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { JsonLd } from "@/components/seo/JsonLd";
import { LOCALE_TAG, OG_LOCALE, routing } from "@/lib/i18n/routing";
import { alternates, siteJsonLd } from "@/lib/seo";
import { clientMessages } from "@/messages";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// The cobalt the browser chrome and the phone status bar pick up.
export const viewport: Viewport = { themeColor: "#1d4aa1" };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: t("site.title"), template: t("site.template") },
    description: t("site.description"),
    openGraph: {
      siteName: "Ao Lume",
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      type: "website",
    },
    alternates: alternates("/", locale),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={LOCALE_TAG[locale]} className={`${schibsted.variable} antialiased`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={clientMessages(locale)}>
          {children}
          <JsonLd data={siteJsonLd(locale)} />
          {publicEnv.metaPixelId && (
            <>
              <MetaPixel id={publicEnv.metaPixelId} />
              <CookieBanner />
            </>
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
