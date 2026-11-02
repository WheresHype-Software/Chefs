import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MobileBookingBar } from "@/components/booking/MobileBookingBar";
import { ChefAbout } from "@/components/chef/ChefAbout";
import { ChefBookingAside } from "@/components/chef/ChefBookingAside";
import { ChefDishes } from "@/components/chef/ChefDishes";
import { ChefGallery } from "@/components/chef/ChefGallery";
import { ChefHeader } from "@/components/chef/ChefHeader";
import { ChefKeyFacts } from "@/components/chef/ChefKeyFacts";
import { ChefOffers } from "@/components/chef/ChefOffers";
import { ChefReviews } from "@/components/chef/ChefReviews";
import { ChefSectionNav, type ChefSection } from "@/components/chef/ChefSectionNav";
import { ChefTerms } from "@/components/chef/ChefTerms";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getChefProfile, getMonthCalendar } from "@/lib/data";
import { fromPrice, rating } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/chef/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const chef = await getChefProfile(slug);
  if (!chef) return {};
  const title = `${chef.name} · ${chef.headline ?? "Chef"} em ${chef.area}`;
  return {
    title,
    description: chef.bio ?? undefined,
    alternates: { canonical: `/chef/${chef.slug}` },
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
function sectionsFor(chef: ChefProfile): ChefSection[] {
  return [
    { id: "sobre", label: "Sobre" },
    { id: "menus", label: "Menus" },
    ...(chef.gallery.some((d) => d.url) ? [{ id: "pratos", label: "Pratos" }] : []),
    { id: "avaliacoes", label: chef.reviewCount ? `Avaliações (${chef.reviewCount})` : "Avaliações" },
    { id: "condicoes", label: "Pagamento" },
  ];
}

export default async function ChefPage({ params, searchParams }: PageProps<"/chef/[slug]">) {
  const { slug } = await params;
  const { oferta } = await searchParams;
  const chef = await getChefProfile(slug);
  if (!chef) notFound();
  const initialCalendar = await initialCalendarFor(chef.id);
  // A newly approved chef may not have published an offer yet: the page must still work.
  const bookable = chef.offers.length > 0;

  return (
    <div>
      <SiteHeader />

      <ChefGallery gallery={chef.gallery} />

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-12 px-5 pb-20 pt-7 md:gap-14 md:px-8 md:pt-10">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-12">
          <div className="flex flex-col gap-5">
            <ChefHeader chef={chef} />
            <ChefKeyFacts chef={chef} />
          </div>
          <ChefSectionNav sections={sectionsFor(chef)} bookable={bookable} />
          <ChefAbout chef={chef} />
          <ChefOffers offers={chef.offers} />
          <ChefDishes chef={chef} />
          <ChefReviews chef={chef} />
          <ChefTerms chef={chef} />
        </main>

        <ChefBookingAside chef={chef} initialCalendar={initialCalendar} initialOfferId={typeof oferta === "string" ? oferta : undefined} />
      </div>

      {bookable && (
        <MobileBookingBar
          targetId="reservar"
          price={fromPrice(chef.offers)}
          rating={`${rating(chef.rating, chef.reviewCount)} · ${chef.area}`}
        />
      )}
      <SiteFooter />
    </div>
  );
}
