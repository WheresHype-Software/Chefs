"use client";

import { Link } from "@/lib/i18n/navigation";
import { usePathname } from "@/lib/i18n/navigation";

export function SideNav({ pending, links }: { pending: number; links: readonly { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <div className="flex flex-col gap-0.5">
      {links.map(({ href, label }) => {
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
