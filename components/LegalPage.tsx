import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 py-16 text-[17px] text-ink-3 md:px-8">
        <span className="lab text-muted">Documento provisório · a rever por advogado</span>
        <h1 className="d m-0 text-[clamp(38px,6vw,56px)] leading-none text-ink">{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
