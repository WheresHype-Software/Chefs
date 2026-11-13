import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";
import { AzulejoTile } from "@/components/brand/Azulejo";
import { SearchResults } from "@/components/search/SearchResults";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CITIES, cityBySlug } from "@/lib/cities";
import { getChefs } from "@/lib/data";
import type { Locale } from "@/lib/i18n/routing";
import { alternates, breadcrumbJsonLd, chefListJsonLd } from "@/lib/seo";

// New chefs and approvals show up within a few minutes.
export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ cidade: c.slug }));
}

async function crumbsFor(cityName: string, slug: string, locale: Locale) {
  const t = await getTranslations({ locale, namespace: "meta.crumbs" });
  return [
    { name: "Ao Lume", href: "/" },
    { name: t("chefsInPortugal"), href: "/procurar" },
    { name: t("chefsIn", { city: cityName }), href: `/chefs/${slug}` },
  ];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/chefs/[cidade]">): Promise<Metadata> {
  const { locale, cidade } = await params;
  const city = cityBySlug(cidade);
  if (!city) return {};
  const t = await getTranslations({ locale: locale as Locale, namespace: "search.city" });
  const chefs = await getChefs(city.lat, city.lng);
  const title = t("title", { city: city.name });
  return {
    title,
    description: t("description", { city: city.name }),
    alternates: alternates(`/chefs/${city.slug}`, locale as Locale),
    // An empty city page is thin content: keep it out of search until someone cooks there.
    robots: chefs.length ? undefined : { index: false, follow: true },
    openGraph: { title },
  };
}

export default async function CityPage({ params }: PageProps<"/[locale]/chefs/[cidade]">) {
  const { locale, cidade } = await params;
  const city = cityBySlug(cidade);
  if (!city) notFound();
  const t = await getTranslations("search.city");
  const chefs = await getChefs(city.lat, city.lng);
  const crumbs = await crumbsFor(city.name, city.slug, locale as Locale);
  const others = CITIES.filter((c) => c.slug !== city.slug);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line bg-paper">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 pb-8 pt-8 md:px-8 md:pt-10">
            <Breadcrumbs items={crumbs} />
            <h1 className="d m-0 text-[clamp(30px,4vw,48px)] leading-[1.05]">{t("title", { city: city.name })}</h1>
            <p className="m-0 max-w-[70ch] text-[17px] text-ink-3">
              {chefs.length ? t("intro", { count: chefs.length, city: city.name }) : t("empty", { city: city.name })}
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
                {t("allChefs")}
              </Link>
              <Link href="/para-chefs" className="btn btn-o btn-sm">
                {t("cookHere", { city: city.name })}
              </Link>
            </div>
          </section>
        )}

        <section aria-labelledby="cidades-title" className="mx-auto max-w-[1280px] px-5 py-12 md:px-8">
          <h2 id="cidades-title" className="m-0 mb-4 text-[18px] font-bold">
            {t("others")}
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
      <JsonLd data={[breadcrumbJsonLd(crumbs, locale as Locale), chefListJsonLd(chefs, locale as Locale)]} />
    </div>
  );
}
