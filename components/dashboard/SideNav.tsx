"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const NAV: [string, string][] = [
  ["/dashboard", "Visão geral"],
  ["/dashboard/pedidos", "Pedidos"],
  ["/dashboard/logistica", "Logística"],
  ["/dashboard/agenda", "Agenda"],
  ["/dashboard/ofertas", "Ofertas"],
  ["/dashboard/cozinha", "Cozinha e serviços"],
  ["/dashboard/avaliacoes", "Avaliações"],
  ["/dashboard/perfil", "Perfil"],
];

export function SideNav({ pending }: { pending: number }) {
  const path = usePathname();
  const list = useRef<HTMLDivElement>(null);

  // On phones the nav is a horizontal strip: keep the current page's tab in view.
  useEffect(() => {
    const strip = list.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    const s = strip.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    strip.scrollLeft += t.left - s.left - (s.width - t.width) / 2;
  }, [path]);

  return (
    <div
      ref={list}
      className="-mx-3 flex snap-x flex-row gap-0.5 overflow-x-auto scroll-px-3 px-3 pb-2 [scrollbar-width:none] md:mx-0 md:snap-none md:flex-col md:overflow-visible md:p-0"
    >
      {NAV.map(([href, label]) => {
        const current = href === "/dashboard" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className="side-link snap-start" aria-current={current ? "page" : undefined}>
            {label}
            {href === "/dashboard/pedidos" && pending > 0 && <span className="lab opacity-70">{pending}</span>}
          </Link>
        );
      })}
    </div>
  );
}
