import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/BookingForm";
import { MobileBookingBar } from "@/components/booking/MobileBookingBar";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CANCELLATION_LABEL, getChefProfile } from "@/lib/data";
import { firstName, fromPrice, initials, MODE_LABEL, offerPriceLabel, rating, SERVICE_LABEL, tierLabel } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";

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

// Gallery layout by photo count: hero 2×2 plus the rest.
const GRID: Record<number, string> = {
  0: "grid-cols-2",
  1: "grid-cols-2",
  2: "grid-cols-2 md:grid-cols-3 md:grid-rows-2",
  3: "grid-cols-2 md:grid-cols-3 md:grid-rows-2",
  4: "grid-cols-2 md:grid-cols-3 md:grid-rows-2",
  5: "grid-cols-2 md:grid-cols-4 md:grid-rows-2",
};

const BADGE_LABEL: Record<string, string> = {
  identity: "Identidade verificada",
  portfolio: "Portefólio verificado",
  certified: "Certificado",
  founder: "Chef fundador",
};

export default async function ChefPage({ params, searchParams }: PageProps<"/chef/[slug]">) {
  const { slug } = await params;
  const { oferta } = await searchParams;
  const chef = await getChefProfile(slug);
  if (!chef) notFound();

  const photos = chef.gallery.length ? chef.gallery : [{ url: null, caption: "Fotografia" }];
  const tier = tierLabel(chef.tier, chef.isNew, chef.reviewCount, chef.rating);
  // A newly approved chef may not have published an offer yet: the page must still work.
  const bookable = chef.offers.length > 0;
  const dishes = chef.gallery.filter((d): d is { url: string; caption: string } => Boolean(d.url));

  return (
    <div>
      <SiteHeader />

      <section className="mx-auto max-w-[1240px] px-5 pt-4 md:px-8 md:pt-6">
        {/* Phones: swipe through every photo. */}
        <ul
          aria-label="Fotografias"
          className="-mx-5 m-0 flex list-none snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] md:hidden"
        >
          {photos.map((p, i) => (
            <li
              key={i}
              className={`aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-[10px] ${photos.length > 1 ? "w-[86%]" : "w-full"}`}
            >
              <Photo
                photo={p.url}
                alt={p.caption}
                priority={i === 0}
                sizes="86vw"
                fallback={i % 2 ? "cobalt" : "glaze"}
                className="h-full w-full"
              />
            </li>
          ))}
        </ul>
        <div className={`hidden h-[440px] gap-2.5 md:grid ${GRID[Math.min(photos.length, 5)]}`}>
          {photos.slice(0, photos.length >= 5 ? 5 : 3).map((p, i) => (
            <div key={i} className={`overflow-hidden rounded-[10px] ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
              <Photo
                photo={p.url}
                alt={p.caption}
                priority={i === 0}
                sizes={i === 0 ? "60vw" : "30vw"}
                fallback={i % 2 ? "cobalt" : "glaze"}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-12 px-5 pb-20 pt-7 md:gap-14 md:px-8 md:pt-10">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-12">
          <div className="flex flex-wrap items-center gap-5 md:gap-6">
            {chef.portrait ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-cobalt-soft md:h-24 md:w-24">
                <Photo photo={chef.portrait} alt={`Fotografia de ${chef.name}`} sizes="96px" priority className="h-full w-full" />
              </div>
            ) : (
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-[22px] font-extrabold tracking-[-0.03em] text-cobalt md:h-24 md:w-24 md:text-[30px]"
              >
                {initials(chef.name)}
              </div>
            )}
            <div className="flex flex-[1_1_300px] flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="lab rounded-[2px] border border-cobalt px-[9px] py-[5px]">{tier}</span>
                {chef.badges.map((b) => (
                  <span key={b} className="lab rounded-[2px] border border-line-2 px-[9px] py-[5px] text-muted">
                    {BADGE_LABEL[b] ?? b}
                  </span>
                ))}
              </div>
              <h1 className="d m-0 text-[clamp(36px,6vw,60px)] leading-none">{chef.name}</h1>
              <span className="text-muted">
                {chef.headline} · {chef.area} · {rating(chef.rating, chef.reviewCount)}
                {chef.socials.instagram && (
                  <>
                    {" · "}
                    <a href={`https://instagram.com/${chef.socials.instagram.replace("@", "")}`} rel="noopener">
                      {chef.socials.instagram}
                    </a>
                  </>
                )}
              </span>
            </div>
          </div>

          <section className="flex flex-col gap-3.5">
            <h2 className="d m-0 text-[32px]">Sobre</h2>
            {chef.bio && <p className="m-0 max-w-[680px] text-[17px]">{chef.bio}</p>}
            <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
              {[
                ["Experiência", chef.yearsExperience ? `${chef.yearsExperience} anos` : "—"],
                ["Área de serviço", `Até ${chef.radiusKm} km de ${chef.area}`],
                ["Línguas", chef.languages.join(", ") || "Português"],
                ["Serviços", chef.services.map((s) => SERVICE_LABEL[s]).join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="border-t border-line pt-3">
                  <dt className="text-[13px] text-muted">{k}</dt>
                  <dd className="m-0">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {(chef.experience.length > 0 || chef.certifications.length > 0) && (
            <section className="flex flex-col gap-3.5">
              <h2 className="d m-0 text-[32px]">Percurso</h2>
              <ul className="m-0 list-none border-t border-line-2 p-0">
                {chef.experience.map((e) => (
                  <li key={e.place + e.years} className="flex flex-wrap justify-between gap-3 border-b border-line py-3.5">
                    <span>
                      <strong className="font-semibold">{e.place}</strong>
                      {e.role ? ` · ${e.role}` : ""}
                    </span>
                    <span className="num text-muted">{e.years}</span>
                  </li>
                ))}
                {chef.certifications.map((c) => (
                  <li key={c.title} className="flex flex-wrap justify-between gap-3 border-b border-line py-3.5">
                    <span>
                      <strong className="font-semibold">{c.title}</strong>
                      {c.issuer ? ` · ${c.issuer}` : ""}
                    </span>
                    {c.verified && <span className="lab text-muted">Documento verificado</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-[18px]">
            <h2 className="d m-0 text-[32px]">Ofertas</h2>
            {!bookable && <p className="m-0 border-t border-line-2 pt-4 text-muted">Ainda sem ofertas publicadas.</p>}
            <div className={bookable ? "border-t border-line-2" : "hidden"}>
              {chef.offers.map((o) => (
                <a
                  key={o.id}
                  href={`?oferta=${o.id}#reservar`}
                  className="flex flex-wrap justify-between gap-5 border-b border-line py-[22px] text-ink no-underline transition-[padding] duration-300 hover:pl-3"
                >
                  <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
                    <span className="lab text-muted">{MODE_LABEL[o.mode]}</span>
                    <strong className="d text-[26px] font-normal leading-[1.15]">{o.title}</strong>
                    {o.description && <span className="text-[15px] text-muted">{o.description}</span>}
                  </div>
                  <div className="flex flex-col items-end justify-between gap-3">
                    <span className="num text-lg font-semibold">{offerPriceLabel(o)}</span>
                    <span className="text-sm underline">Pedir esta oferta</span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {dishes.length > 0 && (
            <section className="flex flex-col gap-[18px]">
              <h2 className="d m-0 text-[32px]">Pratos</h2>
              <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-5 p-0 md:grid-cols-3 md:gap-x-4">
                {dishes.map((d, i) => (
                  <li key={`${d.url}-${i}`}>
                    <figure className="m-0 flex flex-col gap-2">
                      <div className="aspect-square overflow-hidden rounded-[10px] bg-paper">
                        <Photo
                          photo={d.url}
                          alt={d.caption || `Prato de ${chef.name}`}
                          sizes="(min-width: 768px) 20vw, 45vw"
                          className="h-full w-full"
                        />
                      </div>
                      {d.caption && <figcaption className="text-[14px] leading-snug text-ink-3">{d.caption}</figcaption>}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="d m-0 text-[32px]">
                {chef.reviewCount
                  ? `${rating(chef.rating, chef.reviewCount).replace(/\(.*\)/, "")}· ${chef.reviewCount} avaliações`
                  : "Avaliações"}
              </h2>
              <span className="text-sm text-muted">Só clientes com reserva concluída podem avaliar</span>
            </div>
            {chef.categoryAverages.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-8 gap-y-3">
                {chef.categoryAverages.map((k) => (
                  <div key={k.label} className="flex items-center gap-3 text-sm">
                    <span className="flex-[0_0_110px]">{k.label}</span>
                    <span className="h-1 flex-auto overflow-hidden rounded bg-line">
                      <span className="block h-1 bg-cobalt" style={{ width: `${(k.value / 5) * 100}%` }} />
                    </span>
                    <span className="num w-7 text-right">{k.value.toFixed(1).replace(".", ",")}</span>
                  </div>
                ))}
              </div>
            )}
            {chef.reviews.length === 0 ? (
              <p className="m-0 text-muted">Ainda sem avaliações. As primeiras chegam depois das primeiras reservas concluídas.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
                {chef.reviews.map((r) => (
                  <article key={r.id} className="flex flex-col gap-3 rounded-[3px] border border-line p-[22px]">
                    <div className="flex justify-between gap-3 text-sm">
                      <strong className="font-semibold">{r.author}</strong>
                      <span className="text-muted">{new Date(r.date).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</span>
                    </div>
                    {r.what && <span className="text-[13px] text-muted">{r.what}</span>}
                    {r.comment && <p className="m-0">{r.comment}</p>}
                    {r.reply && (
                      <div className="rounded-[2px] bg-paper px-3.5 py-3 text-sm">
                        <strong className="font-semibold">Resposta do chef:</strong> {r.reply}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside id="reservar" className="box box-border flex min-w-0 flex-[1_1_360px] scroll-mt-20 flex-col gap-4 p-5 md:p-[26px]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line-2 pb-3">
            <h2 className="d m-0 text-[26px] md:text-[28px]">Pedir reserva</h2>
            <span className="text-[13px] text-muted">{chef.responseHours ? `responde em ~${chef.responseHours} h` : ""}</span>
          </div>
          {bookable ? (
            <BookingForm key={String(oferta ?? "")} chef={chef} initialOfferId={typeof oferta === "string" ? oferta : undefined} />
          ) : (
            <p className="m-0 text-muted">
              {firstName(chef.name)} ainda está a preparar os menus. Volte em breve
              {chef.socials.instagram ? ", ou acompanhe no Instagram." : "."}
            </p>
          )}
          <dl className="m-0 flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Pagamento ao chef</dt>
              <dd className="m-0 text-right">{chef.paymentMethods.join(" · ")}</dd>
            </div>
            {chef.cancellation && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Cancelamento</dt>
                <dd className="m-0 text-right">{chef.cancellation.text ?? CANCELLATION_LABEL[chef.cancellation.preset]}</dd>
              </div>
            )}
            {chef.depositPercent ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Sinal</dt>
                <dd className="m-0">{chef.depositPercent} % na confirmação</dd>
              </div>
            ) : null}
          </dl>
          <span className="text-xs text-muted">O serviço, preços e pagamentos são combinados diretamente com o chef.</span>
        </aside>
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
