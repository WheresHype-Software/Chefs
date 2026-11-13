import { Link } from "@/lib/i18n/navigation";
import { ChefDoor } from "@/components/auth/ChefDoor";
import { ChefHat } from "@/components/brand/ChefHat";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";
import { AzulejoField, TileMark } from "@/components/brand/Azulejo";
import { MobileMenu } from "@/components/MobileMenu";
import { PanToss } from "@/components/brand/PanToss";
import { SITE_DOMAIN } from "@/lib/constants";
import { publicEnv } from "@/lib/env";
import { COMPANY, COMPLAINTS_BOOK_URL, EMAIL } from "@/lib/legal";

/** The logo; `animated` (public site header) is the pan tossing the letters, elsewhere it stays still. */
export function Wordmark({ suffix, animated = false }: { suffix?: string; animated?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {animated ? (
        <PanToss />
      ) : (
        <>
          <TileMark />
          <span className="wordmark text-[22px] leading-none text-ink">ao lume</span>
        </>
      )}
      {suffix && <span className="hidden whitespace-nowrap text-sm font-medium text-muted sm:inline">{suffix}</span>}
    </span>
  );
}

type NavItem = { href: string; label: string };

const CLIENT_NAV: NavItem[] = [
  { href: "/procurar", label: "Procurar chefs" },
  { href: "/#como", label: "Como funciona" },
  { href: "/pedido", label: "Acompanhar pedido" },
];

const CHEF_NAV: NavItem[] = [
  { href: "/para-chefs#ferramenta", label: "Ferramenta" },
  { href: "/para-chefs#marketing", label: "Marketing" },
  { href: "/para-chefs#perguntas", label: "Perguntas" },
];

/** Changing side (client ↔ chef) is still navigation, just the only one that matters: bold. */
/**
 * A passagem para o outro lado do site, como botão e não como mais uma palavra na navegação.
 *
 * Era um link a negrito no meio dos outros, e passava despercebido: quem vinha cozinhar não
 * percebia que havia um sítio para si e acabava a criar conta de cliente. Em escuro, com o
 * barrete ao lado, lê-se como aquilo que é — uma porta para outro lado, não mais uma secção.
 */
function AudienceSwitch({ href, label, toChef, className = "" }: NavItem & { toChef: boolean; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-semibold no-underline lg:px-4 ${
        toChef ? "bg-ink text-white hover:bg-ink-2" : "border border-line-2 bg-white text-ink hover:border-cobalt"
      } ${className}`}
    >
      {toChef && <ChefHat size={18} className="shrink-0 text-yolk" />}
      {label}
    </Link>
  );
}

export function SiteHeader({ chefs = false }: { chefs?: boolean }) {
  const nav = chefs ? CHEF_NAV : CLIENT_NAV;
  const home = chefs ? "/para-chefs" : "/";
  const brand = (
    <Link href={home} className="no-underline" aria-label="Ao Lume, página inicial">
      <Wordmark suffix={chefs ? "para chefs" : undefined} animated />
    </Link>
  );
  const primary = chefs ? { href: "/entrar?chef=1", label: "Criar perfil" } : { href: "/entrar", label: "Entrar" };
  const secondary = chefs
    ? { href: "/entrar?next=/dashboard", label: "Entrar" }
    : { href: "/entrar?chef=1", label: "Criar perfil de chef" };
  const other: NavItem = chefs ? { href: "/", label: "Sou cliente" } : { href: "/para-chefs", label: "Sou chef" };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-[6px]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-5 md:px-8">
        {brand}
        <div className="flex items-center gap-1">
          <nav aria-label="Principal" className="hidden items-center gap-1 text-[15px] font-medium text-ink-2 md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md px-2 py-2 no-underline hover:bg-paper lg:px-3">
                {item.label}
              </Link>
            ))}
            <AudienceSwitch {...other} toChef={!chefs} />
          </nav>
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line md:block lg:mx-2" />
          {chefs && (
            <Link href={secondary.href} className="btn btn-o btn-sm hidden md:inline-flex">
              {secondary.label}
            </Link>
          )}
          <Link href={primary.href} className="btn btn-sm ml-2">
            {primary.label}
          </Link>
          <MobileMenu
            brand={brand}
            links={nav}
            actions={
              <>
                <Link href={primary.href} className="btn w-full">
                  {primary.label}
                </Link>
                <Link href={secondary.href} className="btn btn-o w-full">
                  {secondary.label}
                </Link>
                {/* Quem cozinha tem de encontrar o seu lado mesmo com o menu aberto, que no
                    telemóvel é por onde se navega. Um link a mais na lista passava-lhe ao lado. */}
                {chefs ? (
                  <AudienceSwitch {...other} toChef={false} className="mt-1 self-start text-[16px]" />
                ) : (
                  <ChefDoor className="-mx-5 mt-2" />
                )}
              </>
            }
          />
        </div>
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
          {/* As regras do sinal vivem nos Termos e na página de cada chef, onde são lidas antes de
              se pedir. Aqui em baixo serviam de pouco e eram a última coisa que alguém levava do site. */}
          <p className="m-0 max-w-[36ch] text-[15px] text-[#c9d6ee]">
            Juntamos quem gosta de comer bem a quem sabe cozinhar. O resto acontece à sua mesa.
          </p>
          <a href={`mailto:${EMAIL.support}`} className="text-[15px] text-[#c9d6ee] no-underline hover:text-white">
            {EMAIL.support}
          </a>
        </div>
        <nav aria-label="Para clientes" className="flex flex-col text-[15px]">
          <span className="mb-1 font-semibold">Clientes</span>
          <Link href="/procurar" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Procurar chefs
          </Link>
          <Link href="/#como" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Como funciona
          </Link>
          <Link href="/pedido" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Acompanhar pedido
          </Link>
          <Link href="/entrar" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Entrar
          </Link>
          <Link href="/apoio" className="py-1.5 text-[#c9d6ee] no-underline hover:text-white">
            Apoio
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
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 text-[14px] text-[#c9d6ee] md:px-8">
          <span>
            © {new Date().getFullYear()} Ao Lume · {COMPANY.name} · NIF {COMPANY.nif}
          </span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Required on Portuguese sites, visibly (DL 74/2017). */}
            <a href={COMPLAINTS_BOOK_URL} target="_blank" rel="noopener noreferrer" className="text-[#c9d6ee] underline hover:text-white">
              Livro de Reclamações
            </a>
            {publicEnv.metaPixelId && (
              <CookieSettingsButton className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[14px] text-[#c9d6ee] underline hover:text-white" />
            )}
            <a href={`https://${SITE_DOMAIN}`} className="font-semibold text-white no-underline hover:underline">
              {SITE_DOMAIN}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
