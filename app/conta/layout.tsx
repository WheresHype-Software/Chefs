import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { SiteFooter, Wordmark } from "@/components/SiteChrome";
import { getSession } from "@/lib/dashboard";

export const metadata: Metadata = { title: "A minha conta", robots: { index: false } };

const LINKS = [
  { href: "/conta", label: "As minhas reservas" },
  { href: "/procurar", label: "Procurar chefs" },
];

/** Client area: bookings and search, nothing from the chef dashboard. */
export default async function ContaLayout({ children }: LayoutProps<"/conta">) {
  const session = await getSession();
  if (session.role === "chef") redirect("/dashboard");

  const brand = (
    <Link href="/" className="no-underline" aria-label="Ao Lume, página inicial">
      <Wordmark />
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-[6px]">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between gap-4 px-5 md:px-8">
          {brand}
          <nav aria-label="Conta" className="hidden items-center gap-1 text-[15px] font-medium md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 no-underline hover:bg-paper">
                {l.label}
              </Link>
            ))}
            {session.role === "admin" && (
              <Link href="/admin" className="rounded-md px-3 py-2 no-underline hover:bg-paper">
                Administração
              </Link>
            )}
            {!session.demo && <SignOutButton className="ml-2 px-3 py-2 text-[15px] font-medium" />}
          </nav>
          <MobileMenu
            brand={brand}
            links={session.role === "admin" ? [...LINKS, { href: "/admin", label: "Administração" }] : LINKS}
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
