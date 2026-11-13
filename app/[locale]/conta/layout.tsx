import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { redirectLocalized } from "@/lib/i18n/server";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { SiteFooter, Wordmark } from "@/components/SiteChrome";
import { getSession } from "@/lib/dashboard";
import type { Locale } from "@/lib/i18n/routing";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/conta">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "account.meta" });
  return { title: t("title"), robots: { index: false }, alternates: alternates("/conta", locale) };
}

/** Client area: bookings and search, nothing from the chef dashboard. */
export default async function ContaLayout({ children }: LayoutProps<"/[locale]/conta">) {
  const session = await getSession();
  if (session.role === "chef") return redirectLocalized("/dashboard");
  const t = await getTranslations("account.nav");
  const tNav = await getTranslations("nav");
  const links = [
    { href: "/conta", label: t("bookings") },
    { href: "/procurar", label: t("search") },
  ];

  const brand = (
    <Link href="/" className="no-underline" aria-label={tNav("homeLabel")}>
      <Wordmark />
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-[6px]">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between gap-4 px-5 md:px-8">
          {brand}
          <nav aria-label={t("label")} className="hidden items-center gap-1 text-[15px] font-medium md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 no-underline hover:bg-paper">
                {l.label}
              </Link>
            ))}
            {session.role === "admin" && (
              <Link href="/admin" className="rounded-md px-3 py-2 no-underline hover:bg-paper">
                {t("admin")}
              </Link>
            )}
            {!session.demo && <SignOutButton className="ml-2 px-3 py-2 text-[15px] font-medium" />}
          </nav>
          <MobileMenu
            brand={brand}
            links={session.role === "admin" ? [...links, { href: "/admin", label: t("admin") }] : links}
            actions={!session.demo && <SignOutButton block />}
          />
        </div>
      </header>
      <main className="mx-auto box-border flex w-full max-w-[1080px] flex-1 flex-col gap-6 px-5 pb-16 pt-8 md:px-8 md:pt-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
