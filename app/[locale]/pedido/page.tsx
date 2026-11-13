import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { GuestLookupForm, RecentBookings } from "@/components/booking/GuestLookup";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import type { Locale } from "@/lib/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/pedido">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "booking.track" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Guests (no account) get back to their booking: this device's list, or number + email. */
export default async function AcompanharPedido({ searchParams }: PageProps<"/[locale]/pedido">) {
  const t = await getTranslations("booking.track");
  const { ref } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[760px] flex-1 flex-col gap-8 px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <div className="flex flex-col gap-2">
          <h1 className="d m-0 text-[clamp(32px,5vw,48px)] leading-[1.05]">{t("title")}</h1>
          <p className="m-0 max-w-[60ch] text-muted">{t("intro")}</p>
        </div>
        <RecentBookings />
        <GuestLookupForm initialRef={typeof ref === "string" ? ref : ""} />
        <p className="m-0 text-sm text-muted">
          {t.rich("account", { link: (c) => <Link href="/entrar">{c}</Link> })}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
