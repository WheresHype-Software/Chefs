import type { Metadata } from "next";
import Link from "next/link";
import { AzulejoTile } from "@/components/brand/Azulejo";
import { ChefTile } from "@/components/search/ChefTile";
import { CuisineSelect } from "@/components/search/CuisineSelect";
import { SearchBar } from "@/components/search/SearchBar";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CUISINES, POPULAR_CUISINES, SERVICE_FILTERS } from "@/lib/constants";
import { dayLabel } from "@/lib/format";
import { searchChefs } from "@/lib/search";
import { parseSearchQuery, searchHref, type SearchQuery } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Procurar chefs",
  description: "Chefs privados e cozinheiros caseiros perto de si: jantares em casa, marmitas, pastelaria, entregas e eventos.",
};

function heading(q: SearchQuery, count: number): string {
  const place = q.where.split(",")[0]?.trim();
  if (count === 0) return place ? `Ainda sem chefs perto de ${place}` : "Ainda sem chefs para esta pesquisa";
  return place ? `Chefs perto de ${place}` : "Chefs no Ao Lume";
}

function summary(q: SearchQuery, count: number): string {
  const parts = [count === 1 ? "1 chef" : `${count} chefs`];
  if (q.date) parts.push(`livres ${dayLabel(q.date)}`);
  return parts.join(", ");
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

export default async function ProcurarPage({ searchParams }: PageProps<"/procurar">) {
  const q = parseSearchQuery(await searchParams);
  const { chefs } = await searchChefs(q);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line bg-paper">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pb-6 pt-8 md:px-8 md:pt-10">
            <SearchBar size="compact" initial={q} />
            <div className="flex flex-col gap-1">
              <h1 className="d m-0 text-[clamp(28px,3.6vw,40px)] leading-[1.08]">{heading(q, chefs.length)}</h1>
              <p className="m-0 text-[15px] text-muted">{summary(q, chefs.length)}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <FilterRow label="Tipo de serviço">
                {SERVICE_FILTERS.map(([key, label]) => (
                  <Link key={key} href={searchHref(q, { service: key })} scroll={false} className="chip" aria-current={q.service === key}>
                    {label}
                  </Link>
                ))}
              </FilterRow>
              <FilterRow label="Cozinha">
                <Link href={searchHref(q, { cuisine: null })} scroll={false} className="chip" aria-current={!q.cuisine}>
                  Todas as cozinhas
                </Link>
                {POPULAR_CUISINES.map((c) => (
                  <Link key={c} href={searchHref(q, { cuisine: c })} scroll={false} className="chip" aria-current={q.cuisine === c}>
                    {c}
                  </Link>
                ))}
                <CuisineSelect
                  current={q.cuisine}
                  options={CUISINES.filter((c) => !POPULAR_CUISINES.includes(c)).map((c) => ({
                    label: c,
                    href: searchHref(q, { cuisine: c }),
                  }))}
                />
              </FilterRow>
            </div>
          </div>
        </section>

        <section aria-label="Resultados" className="mx-auto max-w-[1280px] px-5 py-10 md:px-8">
          {chefs.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-10 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {chefs.map((chef, i) => (
                <li key={chef.id}>
                  <ChefTile chef={chef} priority={i < 3} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[10px]">
                <AzulejoTile variant="glaze" />
              </div>
              <div className="flex flex-col gap-3">
                <p className="m-0 max-w-[56ch] text-[17px] text-ink-3">
                  Ainda não há chefs livres com estes filtros. O Ao Lume está a abrir zona a zona: experimente outra data, outro serviço ou
                  uma zona próxima.
                </p>
                <div className="flex flex-wrap gap-2">
                  {q.date && (
                    <Link href={searchHref(q, { date: null })} className="btn btn-o btn-sm">
                      Qualquer data
                    </Link>
                  )}
                  {(q.service !== "all" || q.cuisine) && (
                    <Link href={searchHref(q, { service: "all", cuisine: null })} className="btn btn-o btn-sm">
                      Todos os serviços
                    </Link>
                  )}
                  <Link href="/procurar" className="btn btn-sm">
                    Ver todos os chefs
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
