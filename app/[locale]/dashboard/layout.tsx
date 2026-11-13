import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { redirectLocalized } from "@/lib/i18n/server";
import { Wordmark } from "@/components/SiteChrome";
import { SideNav } from "@/components/dashboard/SideNav";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { getBookings, getMyChef, getSession } from "@/lib/dashboard";
import { dashboardNav } from "@/lib/dashboard-nav";
import { getSettings } from "@/lib/settings";
import { chefTitle } from "@/lib/format";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "pt" | "en", namespace: "dashboard.meta" });
  return { title: t("title"), robots: { index: false } };
}

export default async function DashboardLayout({ children }: LayoutProps<"/[locale]/dashboard">) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const session = await getSession();
  // The chef dashboard is for chefs and admins; clients have their own area.
  if (session.role === "client") return redirectLocalized("/conta");
  const chef = await getMyChef();
  // Um admin sem perfil de chef não tem nada que fazer aqui: as páginas que se seguem pedem um
  // chef e, quando não o encontram, atiram-no para o formulário de criar perfil. Entrava-se na
  // app e a primeira coisa que aparecia era o pedido para criar uma conta de cozinheiro.
  if (!chef && session.role === "admin") return redirectLocalized("/admin");
  const pending = chef ? (await getBookings({ statuses: ["requested"] })).length : 0;
  const { paymentsEnabled } = await getSettings();
  const nav = dashboardNav(paymentsEnabled);

  const brand = (
    <Link href="/" className="no-underline" aria-label={t("layout.homeLabel")}>
      <Wordmark />
    </Link>
  );
  const status = chef && chef.status !== "approved" ? t("layout.status", { status: chef.status }) : null;
  const navLabels = nav.map((l) => ({ href: l.href, label: t(`nav.${l.key}`) }));

  return (
    <div className="flex min-h-screen flex-col bg-paper text-[15px] md:flex-row md:items-stretch">
      {/* Phones: a slim top bar; the sections live in the menu. */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-[6px] md:hidden">
        {brand}
        <MobileMenu
          brand={brand}
          alert={pending > 0}
          links={navLabels.map((l) => ({ ...l, badge: l.href === "/dashboard/pedidos" ? pending : undefined }))}
          actions={
            <>
              {chef?.status === "approved" && (
                <Link href={`/chef/${chef.slug}`} className="btn btn-o w-full">
                  {t("layout.publicProfile")}
                </Link>
              )}
              {session.role === "admin" && (
                <Link href="/admin" className="btn btn-o w-full">
                  {t("layout.admin")}
                </Link>
              )}
              {chef && (
                <span className="text-sm text-muted">
                  {chef.display_name} · {chefTitle(chef.badges, locale)}
                  {status ? ` · ${status}` : ""}
                </span>
              )}
              {session.demo ? (
                <span className="text-sm text-muted">{t("layout.demo")}</span>
              ) : (
                <SignOutButton block />
              )}
            </>
          }
        />
      </header>

      <nav
        aria-label={t("layout.navLabel")}
        className="box-border hidden flex-[0_0_250px] md:sticky md:top-0 md:h-screen md:overflow-y-auto flex-col gap-0.5 border-r border-line bg-white px-4 py-6 md:flex"
      >
        <div className="flex items-baseline justify-between px-3.5 pb-5">
          {brand}
          <span className="lab text-muted">{session.role === "admin" ? t("layout.roleAdmin") : t("layout.roleChef")}</span>
        </div>
        <SideNav pending={pending} links={navLabels} />
        {chef && (
          <div className="mt-auto flex flex-col gap-1 border-t border-line px-3.5 pt-[18px]">
            <span className="d text-xl">{chef.display_name}</span>
            <span className="text-[13px] text-muted">
              {chefTitle(chef.badges, locale)} · {chef.area_name}
            </span>
            {chef.status === "approved" ? (
              <Link href={`/chef/${chef.slug}`} className="mt-1.5 text-[13px]">
                {t("layout.publicProfileLink")}
              </Link>
            ) : (
              <span className="mt-1.5 text-[13px] text-muted">{status}</span>
            )}
            {!session.demo && <SignOutButton className="mt-3 self-start text-[13px]" />}
          </div>
        )}
        {session.role === "admin" && (
          <Link href="/admin" className="side-link mt-2 border-t border-line pt-4">
            {t("layout.adminLink")}
          </Link>
        )}
        {!chef && !session.demo && <SignOutButton className="mt-auto self-start px-3.5 text-[13px]" />}
        {session.demo && (
          <span className="mx-3.5 mt-4 rounded-[2px] bg-paper px-3 py-2 text-xs text-muted">
            {t("layout.demo")}
          </span>
        )}
      </nav>
      <main className="box-border flex w-full min-w-0 max-w-[1240px] flex-1 flex-col gap-7 px-4 pb-14 pt-6 md:px-11 md:pb-[72px] md:pt-9">
        {children}
      </main>
    </div>
  );
}
