"use client";

import { useLocale, useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { LOCALE_NAME, LOCALES, localizePath, type Locale } from "@/lib/i18n/routing";

type Props = {
  /** "short": PT · EN pills (header); "long": the language names (footer, mobile menu). */
  variant?: "short" | "long";
  className?: string;
  linkClassName?: string;
};

/**
 * Same page, other language. The href is the page's own URL in that language (a plain <a>: a
 * locale Link would point at /pt/… and redirect), so it works without JS and for crawlers; with
 * JS, the click also keeps the query string (search filters, ?chef=1).
 */
export function LanguageSwitch({ variant = "short", className = "", linkClassName = "" }: Props) {
  const t = useTranslations("nav.language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function go(e: MouseEvent<HTMLAnchorElement>, to: Locale) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: to });
  }

  return (
    <nav aria-label={t("label")} className={`flex items-center gap-1 ${className}`}>
      {LOCALES.map((l) =>
        l === locale ? (
          <span key={l} aria-current="true" className={`${linkClassName} font-semibold`}>
            {variant === "short" ? l.toUpperCase() : LOCALE_NAME[l]}
          </span>
        ) : (
          <a
            key={l}
            href={localizePath(pathname, l)}
            hrefLang={l}
            lang={l}
            onClick={(e) => go(e, l)}
            className={`${linkClassName} no-underline opacity-70 hover:opacity-100`}
            aria-label={t("switchTo", { language: LOCALE_NAME[l] })}
          >
            {variant === "short" ? l.toUpperCase() : LOCALE_NAME[l]}
          </a>
        ),
      )}
    </nav>
  );
}
