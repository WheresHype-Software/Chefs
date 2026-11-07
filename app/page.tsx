import { ChefsCta } from "@/components/home/ChefsCta";
import { ClientFaq } from "@/components/home/ClientFaq";
import { getPublicSettings } from "@/lib/settings";
import { HeroWall } from "@/components/home/HeroWall";
import { HowItWorks } from "@/components/home/HowItWorks";
import { NearbyChefs } from "@/components/home/NearbyChefs";
import { ServiceTiles } from "@/components/home/ServiceTiles";
import { TrustPoints } from "@/components/home/TrustPoints";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getChefs } from "@/lib/data";

// Chef data changes (approvals, offers, reviews): rebuild the page at most once a minute.
export const revalidate = 60;

/**
 * The home page answers, in order: what is this, what can I order, how does it work,
 * who cooks near me, why can I trust them, and the questions people have before asking.
 */
export default async function Home() {
  const { paymentsEnabled: paymentsOn } = await getPublicSettings();
  const chefs = await getChefs();
  // Best-rated first; new chefs without reviews keep a place at the end.
  const featured = [...chefs]
    .sort((a, b) => (b.rating ?? 0) * Math.log(2 + b.reviewCount) - (a.rating ?? 0) * Math.log(2 + a.reviewCount))
    .slice(0, 4);

  return (
    <div>
      <SiteHeader />
      <main>
        <HeroWall />
        <ServiceTiles />
        <HowItWorks paymentsOn={paymentsOn} />
        {chefs.length > 0 && <NearbyChefs chefs={chefs} featured={featured} />}
        <TrustPoints />
        <ClientFaq paymentsOn={paymentsOn} />
        <ChefsCta />
      </main>
      <SiteFooter />
    </div>
  );
}
