import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { reflow } from "@/lib/acceptance-format";
import { CONTRACT_TITLE, contractText } from "@/lib/contract";

export const metadata: Metadata = {
  title: CONTRACT_TITLE,
  description: "O contrato que cada chef aceita ao criar conta no Ao Lume.",
  alternates: { canonical: "/contrato-chefs" },
};

/**
 * The chef contract in full, where the sign-up checkbox links to. The same text, character for
 * character, is what gets hashed and archived when a chef accepts it.
 */
export default function ContratoChefs() {
  return (
    <div>
      <SiteHeader chefs />
      <main className="mx-auto flex max-w-[760px] flex-col gap-8 px-5 py-14 text-[16px] leading-relaxed text-ink-3 md:px-8 md:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none text-ink">{CONTRACT_TITLE}</h1>
          <p className="m-0 text-[17px]">
            O contrato entre o Ao Lume e cada chef. Aplica-se em conjunto com os <Link href="/termos">Termos e condições</Link>.
          </p>
        </header>

        <pre className="m-0 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink-3">
          {/* The first line repeats the title above, with the version: it stays in the text that is
              hashed and archived, and leaves the page, where the heading already says it. */}
          {reflow(contractText()).replace(/^[^\n]*\n+/, "")}
        </pre>
      </main>
      <SiteFooter />
    </div>
  );
}
