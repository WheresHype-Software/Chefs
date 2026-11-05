import Link from "next/link";
import type { ReactNode } from "react";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/SiteChrome";

const SECTIONS = [
  { href: "/admin", label: "Aprovações" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
  { href: "/admin/apoio", label: "Apoio" },
] as const;

/** The frame every admin page shares: brand, the sections, and a way out. */
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const brand = (
    <Link href="/" className="no-underline" aria-label="Ao Lume, página inicial">
      <Wordmark />
    </Link>
  );
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 md:px-8">
          {brand}
          <MobileMenu
            brand={brand}
            links={[...SECTIONS, { href: "/dashboard", label: "Painel" }, { href: "/", label: "Página inicial" }]}
            actions={<SignOutButton block />}
          />
          <div className="hidden items-baseline gap-5 text-sm md:flex">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className="text-muted no-underline hover:text-ink">
                {s.label}
              </Link>
            ))}
            <Link href="/dashboard" className="text-muted no-underline hover:text-ink">
              Painel
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-10 md:px-8">
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">{title}</h1>
        {children}
      </main>
    </div>
  );
}
