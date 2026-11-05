import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AzulejoTile } from "@/components/brand/Azulejo";
import { SearchResults } from "@/components/search/SearchResults";
import { Breadcrumbs, type Crumb } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CITIES, cityBySlug, type City } from "@/lib/cities";
import { getChefs } from "@/lib/data";
import { breadcrumbJsonLd, chefListJsonLd } from "@/lib/seo";

// New chefs and approvals show up within a few minutes.
export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ cidade: c.slug }));
}

const crumbsFor = (city: City): Crumb[] => [
  { name: "Ao Lume", href: "/" },
  { name: "Chefs em Portugal", href: "/procurar" },
  { name: `Chefs em ${city.name}`, href: `/chefs/${city.slug}` },
];

export async function generateMetadata({ params }: PageProps<"/chefs/[cidade]">): Promise<Metadata> {
  const city = cityBySlug((await params).cidade);
  if (!city) return {};
  const chefs = await getChefs(city.lat, city.lng);
  const title = `Chefs privados e cozinheiros em ${city.name}`;
  return {
    title,
    description: `Chefs privados e cozinheiros caseiros que cozinham em ${city.name}: jantares em casa, marmitas, bolos e eventos. Veja menus, preços e dias livres, e peça a reserva sem criar conta.`,
    alternates: { canonical: `/chefs/${city.slug}` },
    // An empty city page is thin content: keep it out of search until someone cooks there.
    robots: chefs.length ? undefined : { index: false, follow: true },
    openGraph: { title },
  };
}

export default async function CityPage({ params }: PageProps<"/chefs/[cidade]">) {
  const city = cityBySlug((await params).cidade);
  if (!city) notFound();
  const chefs = await getChefs(city.lat, city.lng);
  const crumbs = crumbsFor(city);
  const others = CITIES.filter((c) => c.slug !== city.slug);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line bg-paper">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 pb-8 pt-8 md:px-8 md:pt-10">
            <Breadcrumbs items={crumbs} />
            <h1 className="d m-0 text-[clamp(30px,4vw,48px)] leading-[1.05]">Chefs privados e cozinheiros em {city.name}</h1>
            <p className="m-0 max-w-[70ch] text-[17px] text-ink-3">
              {chefs.length
                ? `${chefs.length === 1 ? "1 chef cozinha" : `${chefs.length} chefs cozinham`} em ${city.name}: jantares em sua casa, marmitas para a semana, bolos e eventos. Veja menus, preços e dias livres, e peça a reserva sem criar conta. Só paga depois de o chef aceitar.`
                : `Ainda não há chefs a cozinhar em ${city.name}. O Ao Lume está a abrir zona a zona.`}
            </p>
          </div>
        </section>

        {chefs.length > 0 ? (
          <SearchResults chefs={chefs} place={city} />
        ) : (
          <section className="mx-auto flex max-w-[1280px] flex-col items-start gap-5 px-5 py-10 md:flex-row md:items-center md:px-8">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[10px]">
              <AzulejoTile variant="glaze" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/procurar" className="btn btn-sm">
                Ver todos os chefs
              </Link>
              <Link href="/para-chefs" className="btn btn-o btn-sm">
                Cozinha em {city.name}? Crie o seu perfil
              </Link>
            </div>
          </section>
        )}

        <section aria-labelledby="cidades-title" className="mx-auto max-w-[1280px] px-5 py-12 md:px-8">
          <h2 id="cidades-title" className="m-0 mb-4 text-[18px] font-bold">
            Chefs noutras cidades
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {others.map((c) => (
              <li key={c.slug}>
                <Link href={`/chefs/${c.slug}`} className="chip no-underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
      <JsonLd data={[breadcrumbJsonLd(crumbs), chefListJsonLd(chefs)]} />
    </div>
  );
}
