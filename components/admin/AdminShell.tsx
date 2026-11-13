import { Link } from "@/lib/i18n/navigation";
import type { ReactNode } from "react";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/SiteChrome";
import { getMyChef } from "@/lib/dashboard";

const SECTIONS = [
  { href: "/admin", label: "Aprovações" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
  { href: "/admin/apoio", label: "Apoio" },
] as const;

/**
 * The frame every admin page shares: brand, the sections, and a way out.
 *
 * Administração and the chef dashboard are different jobs with different layouts, and most admins
 * do not cook. The link to the chef panel only shows for the ones who also have a profile there;
 * for everyone else it led to a page that immediately asked them to become a chef.
 */
export async function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const chef = await getMyChef();
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
            links={[
              ...SECTIONS,
              ...(chef ? [{ href: "/dashboard" as const, label: "Painel" }] : []),
              { href: "/", label: "Página inicial" },
            ]}
            actions={<SignOutButton block />}
          />
          <div className="hidden items-baseline gap-5 text-sm md:flex">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className="text-muted no-underline hover:text-ink">
                {s.label}
              </Link>
            ))}
            {chef && (
              <Link href="/dashboard" className="text-muted no-underline hover:text-ink">
                Painel
              </Link>
            )}
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
