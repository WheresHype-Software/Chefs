import Link from "next/link";

export function SiteHeaderFloating() {
  return (
    <header className="absolute left-2.5 right-2.5 top-2.5 z-[6] flex items-center justify-between gap-3 rounded-[3px] border border-line bg-white py-2 pl-[22px] pr-2 md:left-4 md:right-4 md:top-4">
      <Link href="/" className="wordmark d text-[22px]">
        Ao Lume
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-[26px] text-sm">
        <a href="#como" className="hidden no-underline md:inline">
          Como funciona
        </a>
        <Link href="/para-chefs" className="no-underline">
          Para chefs
        </Link>
        <Link href="/entrar" className="btn btn-sm">
          Entrar
        </Link>
      </nav>
    </header>
  );
}

export function SiteHeader({ chefs = false }: { chefs?: boolean }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3.5 px-5 py-3 md:px-10">
        <Link href={chefs ? "/para-chefs" : "/"} className="flex items-baseline gap-3 no-underline">
          <span className="wordmark d text-[22px]">Ao Lume</span>
          {chefs && <span className="lab text-muted">Chefs</span>}
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-7 text-sm">
          {chefs ? (
            <>
              <a href="#ferramenta" className="hidden no-underline md:inline">
                Ferramenta
              </a>
              <a href="#marketing" className="hidden no-underline md:inline">
                Marketing
              </a>
              <a href="#perguntas" className="hidden no-underline md:inline">
                Perguntas
              </a>
              <Link href="/" className="hidden no-underline md:inline">
                Sou cliente
              </Link>
              <Link href="/entrar?chef=1" className="btn btn-sm">
                Começar
              </Link>
            </>
          ) : (
            <>
              <Link href="/para-chefs" className="no-underline">
                Para chefs
              </Link>
              <Link href="/entrar" className="btn btn-sm">
                Entrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ chefs = false }: { chefs?: boolean }) {
  return (
    <footer className="mx-auto flex max-w-[1240px] flex-wrap items-baseline justify-between gap-5 px-5 pb-12 pt-10 text-[13px] text-muted md:px-8">
      <span className="wordmark d text-lg text-ink">Ao Lume</span>
      <nav aria-label="Rodapé" className="flex flex-wrap gap-[22px]">
        {chefs ? (
          <Link href="/" className="text-muted">
            Para clientes
          </Link>
        ) : (
          <Link href="/para-chefs" className="text-muted">
            Para chefs
          </Link>
        )}
        <Link href="/termos" className="text-muted">
          Termos
        </Link>
        <Link href="/privacidade" className="text-muted">
          Privacidade
        </Link>
        <a href="https://instagram.com/aolume" className="text-muted" rel="noopener">
          Instagram
        </a>
      </nav>
      <span>Cada chef é responsável pelo seu serviço, licenças e pagamentos.</span>
    </footer>
  );
}
