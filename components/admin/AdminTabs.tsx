"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminTab = {
  href: string;
  label: string;
  /** Quantos esperam por uma decisão. Zero não se mostra: um zero a mais é ruído. */
  count?: number;
};

/**
 * As secções de uma área do admin, como páginas e não como âncoras.
 *
 * Eram sete blocos empilhados na mesma página com links que faziam scroll. Dava uma página que
 * demorava a carregar tudo para mostrar uma coisa, e obrigava a procurar com os olhos o sítio
 * onde se tinha aterrado. Cada secção é agora um endereço: abre direita, recarrega sozinha, e
 * pode ficar aberta num separador enquanto se trabalha noutra.
 */
export function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Secções"
      className="sticky top-0 z-10 -mx-5 border-b border-line bg-paper/95 px-5 py-2.5 backdrop-blur-[6px] md:mx-0 md:px-0"
    >
      <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 [scrollbar-width:none]">
        {tabs.map((t) => {
          const active = path === t.href;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold no-underline ${
                  active ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink hover:border-cobalt"
                }`}
              >
                {t.label}
                {t.count ? (
                  <span className={`num rounded-full px-2 text-[13px] ${active ? "bg-white/20 text-white" : "bg-cobalt text-white"}`}>
                    {t.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
