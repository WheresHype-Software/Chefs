import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { lisbonStamp, reflow } from "@/lib/acceptance-format";
import { DEFAULT_LOCALE, routing } from "@/lib/i18n/routing";
import { englishLegalDate } from "@/lib/legal.en";
import { createAnonClient, hasSupabase } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/arquivo/[sha]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : DEFAULT_LOCALE, namespace: "legal.meta.archive" });
  return { title: t("title"), robots: { index: false } };
}

const SHA = /^[0-9a-f]{64}$/;

/**
 * An archived legal text, exactly as someone accepted it. The links in the acceptance emails land
 * here, so they keep showing the same words after the terms or the contract change. The address
 * is the text's SHA-256, which anyone can check against what they saved.
 *
 * The text itself is always shown as it was accepted, in Portuguese, whatever the page's
 * language: only the labels around it are translated.
 */
export default async function Arquivo({ params }: PageProps<"/[locale]/arquivo/[sha]">) {
  const { locale, sha } = await params;
  if (!hasSupabase || !SHA.test(sha)) notFound();
  const { data } = await createAnonClient()
    .from("legal_texts")
    .select("kind, version, title, body, created_at")
    .eq("sha256", sha)
    .maybeSingle();
  if (!data) notFound();
  const t = data as { kind: string; version: string; title: string; body: string; created_at: string };
  const tr = await getTranslations("legal.archive");
  const english = locale === "en";
  const stamp = lisbonStamp(t.created_at, english ? "en" : "pt");

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-5 py-14 text-[16px] leading-relaxed text-ink-3 md:px-8 md:py-16">
        <header className="flex flex-col gap-2">
          <span className="lab text-muted">{tr("label")}</span>
          <h1 lang="pt-PT" className="d m-0 text-[clamp(30px,4.5vw,44px)] leading-none text-ink">
            {t.title}
          </h1>
          <span className="text-[14px] text-muted">
            {t.kind === "terms"
              ? tr("versionTerms", { version: english ? englishLegalDate(t.version) : t.version, date: stamp })
              : tr("versionContract", { version: t.version, date: stamp })}
          </span>
        </header>
        <p className="m-0 rounded-[10px] border border-line bg-paper p-4 text-sm">
          {tr.rich("note", { sha, hash: (c) => <span className="num break-all">{c}</span> })}
        </p>
        <pre lang="pt-PT" className="m-0 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink-3">
          {reflow(t.body)}
        </pre>
      </main>
      <SiteFooter />
    </div>
  );
}
