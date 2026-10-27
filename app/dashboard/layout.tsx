import type { Metadata } from "next";
import Link from "next/link";
import { SideNav } from "@/components/dashboard/SideNav";
import { getBookings, getMyChef, getSession } from "@/lib/dashboard";
import { tierLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await getSession();
  const chef = await getMyChef();
  const pending = chef ? (await getBookings({ statuses: ["requested"] })).length : 0;

  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-paper text-[15px]">
      <nav
        aria-label="Painel"
        className="box-border flex flex-[1_1_100%] flex-col gap-0.5 border-b border-line bg-white px-3 py-3.5 md:min-h-screen md:flex-[0_0_250px] md:border-b-0 md:border-r md:px-4 md:py-6"
      >
        <div className="flex items-baseline justify-between px-3.5 pb-3 md:pb-5">
          <Link href="/" className="wordmark d text-lg">
            Ao Lume
          </Link>
          <span className="lab text-muted">{session.role === "admin" ? "Admin" : "Chef"}</span>
        </div>
        <SideNav pending={pending} />
        {chef && (
          <div className="mt-auto hidden flex-col gap-1 border-t border-line px-3.5 pt-[18px] md:flex">
            <span className="d text-xl">{chef.display_name}</span>
            <span className="text-[13px] text-muted">
              {tierLabel(chef.tier)} · {chef.area_name}
            </span>
            {chef.status === "approved" ? (
              <Link href={`/chef/${chef.slug}`} className="mt-1.5 text-[13px]">
                Ver perfil público →
              </Link>
            ) : (
              <span className="mt-1.5 text-[13px] text-muted">Perfil {chef.status === "pending" ? "em revisão" : "ainda não publicado"}</span>
            )}
            {session.role === "admin" && (
              <Link href="/admin" className="mt-1.5 text-[13px]">
                Administração →
              </Link>
            )}
          </div>
        )}
        {session.demo && (
          <span className="mx-3.5 mt-4 hidden rounded-[2px] bg-paper px-3 py-2 text-xs text-muted md:block">
            Modo de demonstração: dados de exemplo, nada é guardado.
          </span>
        )}
      </nav>
      <main className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-7 px-4 pb-14 pt-6 md:px-11 md:pb-[72px] md:pt-9">{children}</main>
    </div>
  );
}
