"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <div className="flex flex-row gap-0.5 overflow-x-auto [scrollbar-width:none] md:flex-col">
      {NAV.map(([href, label]) => {
        const current = href === "/dashboard" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className="side-link" aria-current={current ? "page" : undefined}>
            {label}
            {href === "/dashboard/pedidos" && pending > 0 && <span className="lab opacity-70">{pending}</span>}
          </Link>
        );
      })}
    </div>
  );
}
