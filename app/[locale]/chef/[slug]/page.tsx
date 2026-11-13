import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MobileBookingBar } from "@/components/booking/MobileBookingBar";
import { ChefAbout } from "@/components/chef/ChefAbout";
import { ChefBookingAside } from "@/components/chef/ChefBookingAside";
import { ChefCuisines } from "@/components/chef/ChefCuisines";
import { ChefGallery } from "@/components/chef/ChefGallery";
import { ChefHeader } from "@/components/chef/ChefHeader";
import { ChefKeyFacts } from "@/components/chef/ChefKeyFacts";
import { ChefOffers } from "@/components/chef/ChefOffers";
import { ChefReviews } from "@/components/chef/ChefReviews";
import { ChefSectionNav, type NavSection } from "@/components/chef/ChefSectionNav";
import { ChefTerms } from "@/components/chef/ChefTerms";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getChefProfile, getMonthCalendar } from "@/lib/data";
import { fromPrice, rating, titledName } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import { alternates, breadcrumbJsonLd, chefBreadcrumbs, chefJsonLd } from "@/lib/seo";
import type { ChefProfile } from "@/lib/types";
import { paymentsLive } from "@/lib/settings";

export async function generateMetadata({ params }: PageProps<"/[locale]/chef/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const chef = await getChefProfile(slug, locale as Locale);
  if (!chef) return {};
  const t = await getTranslations({ locale: locale as Locale, namespace: "chef.meta" });
  const title = t("title", { name: titledName(chef, locale as Locale), headline: chef.headline ?? t("defaultHeadline"), area: chef.area ?? "" });
  return {
    title,
    description: chef.bio ?? undefined,
    alternates: alternates(`/chef/${chef.slug}`, locale as Locale),
    openGraph: { title, description: chef.bio ?? undefined, images: chef.cover ? [chef.cover] : undefined },
  };
}

/**
 * The current month comes with the page so the booking calendar shows at once; other months
 * load from /api/calendar. If this fails, the calendar fetches it itself.
 */
async function initialCalendarFor(chefId: string) {
  const today = new Date();
  return getMonthCalendar(chefId, today.getFullYear(), today.getMonth())
    .then((calendar) => ({ year: today.getFullYear(), month: today.getMonth(), calendar }))
    .catch((err) => {
      console.error("[chef page] calendar:", err);
      return undefined;
    });
}

/** The jump links: only sections this chef actually has. */
function sectionsFor(chef: ChefProfile, t: Awaited<ReturnType<typeof getTranslations<"chef.nav">>>): NavSection[] {
  return [
    { id: "sobre", label: t("about") },
    { id: "menus", label: t("menus") },
    { id: "condicoes", label: t("terms") },
    { id: "avaliacoes", label: chef.reviewCount ? t("reviewsCount", { count: chef.reviewCount }) : t("reviews") },
  ];
}

export default async function ChefPage({ params, searchParams }: PageProps<"/[locale]/chef/[slug]">) {
  const { locale, slug } = await params;
  const { oferta } = await searchParams;
  const chef = await getChefProfile(slug, locale as Locale);
  if (!chef) notFound();
  const tNav = await getTranslations("chef.nav");
  const initialCalendar = await initialCalendarFor(chef.id);
  const crumbs = chefBreadcrumbs(chef, locale as Locale);
  // A newly approved chef may not have published an offer yet: the page must still work.
  const bookable = chef.offers.length > 0;

  return (
    <div>
      <SiteHeader />

      <ChefGallery gallery={chef.gallery} />

      <div className="mt-6 bg-paper">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-8 px-5 pb-20 pt-7 md:gap-10 md:px-8 md:pt-10">
          <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
            <div className="flex flex-col gap-5">
              <Breadcrumbs items={crumbs} />
              <ChefHeader chef={chef} />
              <ChefKeyFacts chef={chef} />
            </div>
            <ChefSectionNav sections={sectionsFor(chef, tNav)} bookable={bookable} />
            <ChefAbout chef={chef} />
            <ChefCuisines chef={chef} />
            <ChefOffers offers={chef.offers} />
            {/* The rules sit right after the menus, so they are read before choosing. */}
            <ChefTerms chef={chef} paymentsOn={await paymentsLive()} />
            <ChefReviews chef={chef} />
          </main>

          <ChefBookingAside
            chef={chef}
            initialCalendar={initialCalendar}
            initialOfferId={typeof oferta === "string" ? oferta : undefined}
          />
        </div>
      </div>

      {bookable && (
        <MobileBookingBar
          targetId="reservar"
          price={fromPrice(chef.offers, locale as Locale)}
          rating={`${rating(chef.rating, chef.reviewCount, locale as Locale)} · ${chef.area}`}
        />
      )}
      <SiteFooter />
      <JsonLd data={[chefJsonLd(chef, locale as Locale), breadcrumbJsonLd(crumbs, locale as Locale)]} />
    </div>
  );
}
