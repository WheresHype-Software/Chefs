import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { lisbonStamp, reflow } from "@/lib/acceptance-format";
import { createAnonClient, hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Texto aceite", robots: { index: false } };

const SHA = /^[0-9a-f]{64}$/;

/**
 * An archived legal text, exactly as someone accepted it. The links in the acceptance emails land
 * here, so they keep showing the same words after the terms or the contract change. The address
 * is the text's SHA-256, which anyone can check against what they saved.
 */
export default async function Arquivo({ params }: PageProps<"/[locale]/arquivo/[sha]">) {
  const { sha } = await params;
  if (!hasSupabase || !SHA.test(sha)) notFound();
  const { data } = await createAnonClient()
    .from("legal_texts")
    .select("kind, version, title, body, created_at")
    .eq("sha256", sha)
    .maybeSingle();
  if (!data) notFound();
  const t = data as { kind: string; version: string; title: string; body: string; created_at: string };

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-5 py-14 text-[16px] leading-relaxed text-ink-3 md:px-8 md:py-16">
        <header className="flex flex-col gap-2">
          <span className="lab text-muted">Texto arquivado</span>
          <h1 className="d m-0 text-[clamp(30px,4.5vw,44px)] leading-none text-ink">{t.title}</h1>
          <span className="text-[14px] text-muted">
            {t.kind === "terms" ? `Versão de ${t.version}` : `Versão ${t.version}`} · arquivado a {lisbonStamp(t.created_at)}
          </span>
        </header>
        <p className="m-0 rounded-[10px] border border-line bg-paper p-4 text-sm">
          Este é o texto exato que foi aceite, mesmo que entretanto exista uma versão mais recente. Pode guardá-lo ou imprimi-lo pelo
          navegador. Impressão digital (SHA-256): <span className="num break-all">{sha}</span>
        </p>
        <pre className="m-0 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink-3">{reflow(t.body)}</pre>
      </main>
      <SiteFooter />
    </div>
  );
}
