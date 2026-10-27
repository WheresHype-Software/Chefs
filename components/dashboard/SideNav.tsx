"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV } from "@/lib/dashboard-nav";

export function SideNav({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <div className="flex flex-col gap-0.5">
      {DASHBOARD_NAV.map(({ href, label }) => {
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
