import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { DEFAULT_LOCALE } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { LEGAL_UPDATED } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: ReactNode };

type Props = { title: string; intro: ReactNode; sections: LegalSection[]; updated?: string; path: string };

/**
 * On a translated legal page: the translation is a courtesy, the Portuguese text is the binding
 * one, with a link to it. Renders nothing in Portuguese.
 */
export function CourtesyNotice({ path }: { path: string }) {
  const locale = useLocale();
  const t = useTranslations("legal.notice");
  if (locale === DEFAULT_LOCALE) return null;
  return (
    <aside role="note" className="flex flex-col gap-1 rounded-[10px] border border-line bg-paper p-4 text-[15px]">
      <strong className="text-ink">{t("title")}</strong>
      <span>
        {t("body")}{" "}
        <Link href={path} locale={DEFAULT_LOCALE} hrefLang="pt-PT" className="font-semibold">
          {t("link")}
        </Link>
      </span>
    </aside>
  );
}

/** A legal document: title and date, a clickable index, then numbered sections. */
export function LegalPage({ title, intro, sections, updated = LEGAL_UPDATED, path }: Props) {
  const t = useTranslations("legal.page");
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-[760px] flex-col gap-8 px-5 py-14 text-[16px] leading-relaxed text-ink-3 md:px-8 md:py-16">
        <CourtesyNotice path={path} />
        <header className="flex flex-col gap-3">
          <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none text-ink">{title}</h1>
          <span className="text-[14px] text-muted">{t("updated", { date: updated })}</span>
          <div className="text-[17px] [&_p]:m-0">{intro}</div>
        </header>

        <nav aria-label={t("toc")} className="rounded-[10px] border border-line bg-paper p-5">
          <span className="mb-2 block text-[14px] font-semibold text-ink">{t("toc")}</span>
          <ol className="m-0 grid list-decimal gap-1 pl-5 text-[15px] sm:grid-cols-2 sm:gap-x-6">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-ink-3 no-underline hover:text-cobalt hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-title`}
            className="flex scroll-mt-20 flex-col gap-3 [&_li]:mt-1.5 [&_p]:m-0 [&_strong]:text-ink [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5"
          >
            <h2 id={`${s.id}-title`} className="m-0 text-[20px] font-bold leading-snug text-ink">
              {i + 1}. {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
