"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { ErrorState } from "@/components/ErrorState";
import { LOCALE_TAG, splitLocale } from "@/lib/i18n/routing";
import commonEn from "@/messages/en/common.json";
import supportEn from "@/messages/en/support.json";
import commonPt from "@/messages/pt/common.json";
import supportPt from "@/messages/pt/support.json";

// The root layout (and its message provider) is gone here, so this page brings the few messages
// ErrorState needs, in both languages, and reads the language from the URL.
const MESSAGES = { pt: { common: commonPt, support: supportPt }, en: { common: commonEn, support: supportEn } };

/** Last resort when the root layout itself fails; it replaces the whole document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const { locale } = splitLocale(usePathname() ?? "/");
  const messages = MESSAGES[locale];
  return (
    <html lang={LOCALE_TAG[locale]}>
      <body className="bg-paper">
        <title>{messages.support.errorPage.documentTitle}</title>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Lisbon">
          <main className="mx-auto max-w-[1080px] px-5 md:px-8">
            <ErrorState error={error} retry={retry} />
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
