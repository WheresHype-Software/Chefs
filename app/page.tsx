import Link from "next/link";
import { ChefsCta } from "@/components/home/ChefsCta";
import { HeroWall } from "@/components/home/HeroWall";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ServiceTiles } from "@/components/home/ServiceTiles";
import { ChefTile } from "@/components/search/ChefTile";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getChefs } from "@/lib/data";

export default async function Home() {
  const chefs = await getChefs();
  // Best-rated first; new chefs without reviews keep a place at the end.
  const featured = [...chefs]
    .sort((a, b) => (b.rating ?? 0) * Math.log(2 + b.reviewCount) - (a.rating ?? 0) * Math.log(2 + a.reviewCount))
    .slice(0, 3);

  return (
    <div>
      <SiteHeader />
      <main>
        <HeroWall />
        <ServiceTiles />
        <HowItWorks />

        {featured.length > 0 && (
          <section aria-labelledby="destaque-title" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-24">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="destaque-title" className="d m-0 text-[clamp(28px,3.4vw,40px)] leading-[1.05]">
                Chefs com as melhores avaliações
              </h2>
              <Link href="/procurar" className="text-[16px] font-semibold text-cobalt no-underline hover:underline">
                Ver todos os chefs →
              </Link>
            </div>
            <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-10 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((chef) => (
                <li key={chef.id}>
                  <ChefTile chef={chef} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <ChefsCta />
      </main>
      <SiteFooter />
    </div>
  );
}
