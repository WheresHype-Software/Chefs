import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/SiteChrome";
import { SideNav } from "@/components/dashboard/SideNav";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { getBookings, getMyChef, getSession } from "@/lib/dashboard";
import { DASHBOARD_NAV } from "@/lib/dashboard-nav";
import { tierLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await getSession();
  const chef = await getMyChef();
  const pending = chef ? (await getBookings({ statuses: ["requested"] })).length : 0;

  const brand = (
    <Link href="/" className="no-underline" aria-label="Ao Lume, página inicial">
      <Wordmark />
    </Link>
  );
  const status = chef && chef.status !== "approved" ? `Perfil ${chef.status === "pending" ? "em revisão" : "ainda não publicado"}` : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-[15px] md:flex-row md:items-stretch">
      {/* Phones: a slim top bar; the sections live in the menu. */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-[6px] md:hidden">
        {brand}
        <MobileMenu
          brand={brand}
          alert={pending > 0}
          links={DASHBOARD_NAV.map((l) => ({ ...l, badge: l.href === "/dashboard/pedidos" ? pending : undefined }))}
          actions={
            <>
              {chef?.status === "approved" && (
                <Link href={`/chef/${chef.slug}`} className="btn btn-o w-full">
                  Ver perfil público
                </Link>
              )}
              {session.role === "admin" && (
                <Link href="/admin" className="btn btn-o w-full">
                  Administração
                </Link>
              )}
              {chef && (
                <span className="text-sm text-muted">
                  {chef.display_name} · {tierLabel(chef.tier)}
                  {status ? ` · ${status}` : ""}
                </span>
              )}
              {session.demo ? (
                <span className="text-sm text-muted">Modo de demonstração: dados de exemplo, nada é guardado.</span>
              ) : (
                <SignOutButton block />
              )}
            </>
          }
        />
      </header>

      <nav
        aria-label="Painel"
        className="box-border hidden min-h-screen flex-[0_0_250px] flex-col gap-0.5 border-r border-line bg-white px-4 py-6 md:flex"
      >
        <div className="flex items-baseline justify-between px-3.5 pb-5">
          {brand}
          <span className="lab text-muted">{session.role === "admin" ? "Admin" : "Chef"}</span>
        </div>
        <SideNav pending={pending} />
        {chef && (
          <div className="mt-auto flex flex-col gap-1 border-t border-line px-3.5 pt-[18px]">
            <span className="d text-xl">{chef.display_name}</span>
            <span className="text-[13px] text-muted">
              {tierLabel(chef.tier)} · {chef.area_name}
            </span>
            {chef.status === "approved" ? (
              <Link href={`/chef/${chef.slug}`} className="mt-1.5 text-[13px]">
                Ver perfil público →
              </Link>
            ) : (
              <span className="mt-1.5 text-[13px] text-muted">{status}</span>
            )}
            {!session.demo && <SignOutButton className="mt-3 self-start text-[13px]" />}
          </div>
        )}
        {session.role === "admin" && (
          <Link href="/admin" className="side-link mt-2 border-t border-line pt-4">
            Administração →
          </Link>
        )}
        {!chef && !session.demo && <SignOutButton className="mt-auto self-start px-3.5 text-[13px]" />}
        {session.demo && (
          <span className="mx-3.5 mt-4 rounded-[2px] bg-paper px-3 py-2 text-xs text-muted">
            Modo de demonstração: dados de exemplo, nada é guardado.
          </span>
        )}
      </nav>
      <main className="box-border flex min-w-0 flex-1 flex-col gap-7 px-4 pb-14 pt-6 md:px-11 md:pb-[72px] md:pt-9">{children}</main>
    </div>
  );
}
