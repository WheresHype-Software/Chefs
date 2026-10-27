import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 py-16 text-[17px] text-ink-3 md:px-8">
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none text-ink">{title}</h1>
        <p className="m-0 rounded-md bg-yolk-soft px-4 py-3 text-[15px] text-ink">Documento provisório, ainda a rever por um advogado.</p>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
