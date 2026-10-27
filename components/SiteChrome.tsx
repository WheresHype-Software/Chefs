import Link from "next/link";
import { AzulejoField, TileMark } from "@/components/brand/Azulejo";

export function Wordmark({ suffix }: { suffix?: string }) {
  return (
    <span className="flex items-center gap-2">
      <TileMark />
      <span className="wordmark text-[22px] leading-none text-ink">ao lume</span>
      {suffix && <span className="hidden whitespace-nowrap text-sm font-medium text-muted sm:inline">{suffix}</span>}
    </span>
  );
}

type NavItem = { href: string; label: string; /** Also shown on phones, next to the main button. */ mobile?: boolean };

const CLIENT_NAV: NavItem[] = [
  { href: "/#como", label: "Como funciona" },
  { href: "/procurar", label: "Procurar chefs" },
  { href: "/para-chefs", label: "Sou chef", mobile: true },
];

const CHEF_NAV: NavItem[] = [
  { href: "#ferramenta", label: "Ferramenta" },
  { href: "#marketing", label: "Marketing" },
  { href: "#perguntas", label: "Perguntas" },
  { href: "/", label: "Sou cliente" },
  { href: "/entrar?next=/dashboard", label: "Entrar", mobile: true },
];

export function SiteHeader({ chefs = false }: { chefs?: boolean }) {
  const nav = chefs ? CHEF_NAV : CLIENT_NAV;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-[6px]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-5 md:px-8">
        <Link href={chefs ? "/para-chefs" : "/"} className="no-underline" aria-label="Ao Lume, página inicial">
          <Wordmark suffix={chefs ? "para chefs" : undefined} />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1 text-[15px] font-medium">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.mobile ? "inline" : "hidden md:inline"} rounded-md px-3 py-2 no-underline hover:bg-paper`}
            >
              {item.label}
            </Link>
          ))}
          <Link href={chefs ? "/entrar?chef=1" : "/entrar"} className="btn btn-sm ml-1 md:ml-2">
            {chefs ? "Criar perfil" : "Entrar"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ chefs = false }: { chefs?: boolean }) {
  return (
    <footer className="bg-cobalt-deep text-white">
      <div className="h-12 overflow-hidden" aria-hidden="true">
        <AzulejoField variant="cobalt" size={48} />
      </div>
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-6 gap-y-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-10 md:px-8 md:py-14">
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <span className="wordmark text-[26px] text-white">ao lume</span>
          <p className="m-0 max-w-[36ch] text-[15px] text-[#c9d6ee]">
            Chefs e cozinheiros caseiros perto de si. O serviço, os preços e os pagamentos são combinados diretamente com cada chef.
          </p>
        </div>
        <nav aria-label="Para clientes" className="flex flex-col text-[15px]">
          <span className="mb-1 font-semibold">Clientes</span>
          <Link href="/procurar" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Procurar chefs
          </Link>
          <Link href="/#como" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Como funciona
          </Link>
          <Link href="/entrar" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Entrar
          </Link>
        </nav>
        <nav aria-label="Para chefs" className="flex flex-col text-[15px]">
          <span className="mb-1 font-semibold">{chefs ? "Ao Lume" : "Chefs"}</span>
          <Link href="/para-chefs" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Ao Lume para chefs
          </Link>
          <Link href="/termos" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Termos
          </Link>
          <Link href="/privacidade" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
