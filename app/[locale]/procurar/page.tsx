import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { AzulejoTile } from "@/components/brand/Azulejo";
import { SearchResults } from "@/components/search/SearchResults";
import { CuisineSelect } from "@/components/search/CuisineSelect";
import { SearchBar } from "@/components/search/SearchBar";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CUISINES, cuisineLabel, POPULAR_CUISINES, SERVICE_FILTERS } from "@/lib/constants";
import { dayLabel, serviceLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import { searchChefs } from "@/lib/search";
import { parseSearchQuery, searchHref, type SearchQuery } from "@/lib/search-params";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/procurar">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "search.meta" });
  return { title: t("title"), description: t("description"), alternates: alternates("/procurar", locale) };
}

type T = Awaited<ReturnType<typeof getTranslations<"search">>>;

function heading(t: T, q: SearchQuery, count: number): string {
  const place = q.where.split(",")[0]?.trim();
  if (count === 0) return place ? t("heading.noneNear", { place }) : t("heading.none");
  return place ? t("heading.near", { place }) : t("heading.all");
}

function summary(t: T, locale: Locale, q: SearchQuery, count: number): string {
  const found = q.date ? t("summary.countOnDate", { count, day: dayLabel(q.date, locale) }) : t("summary.count", { count });
  return count ? t("summary.hint", { found }) : found;
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
    >
      {children}
    </div>
  );
}

export default async function ProcurarPage({ params, searchParams }: PageProps<"/[locale]/procurar">) {
  const locale = (await params).locale as Locale;
  const t = await getTranslations("search");
  const tc = await getTranslations("search.cuisines");
  const cuisine = (name: string) => cuisineLabel((k) => tc(k), name);
  const q = parseSearchQuery(await searchParams);
  const { chefs, place } = await searchChefs(q);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line bg-paper">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pb-6 pt-8 md:px-8 md:pt-10">
            <SearchBar key={`${q.where}|${q.service}|${q.date ?? ""}`} size="compact" initial={q} />
            <div className="flex flex-col gap-1">
              <h1 className="d m-0 text-[clamp(28px,3.6vw,40px)] leading-[1.08]">{heading(t, q, chefs.length)}</h1>
              <p className="m-0 text-[15px] text-muted">{summary(t, locale, q, chefs.length)}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <FilterRow label={t("filters.service")}>
                {SERVICE_FILTERS.map((key) => (
                  <Link key={key} href={searchHref(q, { service: key })} scroll={false} className="chip" aria-current={q.service === key}>
                    {key === "all" ? t("filters.all") : serviceLabel(key, locale)}
                  </Link>
                ))}
              </FilterRow>
              <FilterRow label={t("filters.cuisine")}>
                <Link href={searchHref(q, { cuisine: null })} scroll={false} className="chip" aria-current={!q.cuisine}>
                  {t("filters.allCuisines")}
                </Link>
                {POPULAR_CUISINES.map((c) => (
                  <Link key={c} href={searchHref(q, { cuisine: c })} scroll={false} className="chip" aria-current={q.cuisine === c}>
                    {cuisine(c)}
                  </Link>
                ))}
                <CuisineSelect
                  current={q.cuisine}
                  options={CUISINES.filter((c) => !POPULAR_CUISINES.includes(c)).map((c) => ({
                    value: c,
                    label: cuisine(c),
                    href: searchHref(q, { cuisine: c }),
                  }))}
                />
              </FilterRow>
            </div>
          </div>
        </section>

        {chefs.length > 0 ? (
          <SearchResults key={chefs.map((c) => c.id).join()} chefs={chefs} place={place} />
        ) : (
          <section aria-label={t("empty.label")} className="mx-auto max-w-[1280px] px-5 py-10 md:px-8">
            <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[10px]">
                <AzulejoTile variant="glaze" />
              </div>
              <div className="flex flex-col gap-3">
                <p className="m-0 max-w-[56ch] text-[17px] text-ink-3">{t("empty.text")}</p>
                <div className="flex flex-wrap gap-2">
                  {q.date && (
                    <Link href={searchHref(q, { date: null })} className="btn btn-o btn-sm">
                      {t("empty.anyDate")}
                    </Link>
                  )}
                  {(q.service !== "all" || q.cuisine) && (
                    <Link href={searchHref(q, { service: "all", cuisine: null })} className="btn btn-o btn-sm">
                      {t("empty.allServices")}
                    </Link>
                  )}
                  <Link href="/procurar" className="btn btn-sm">
                    {t("empty.allChefs")}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
