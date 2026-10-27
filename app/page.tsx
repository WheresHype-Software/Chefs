import Link from "next/link";
import { MapExplorer, ServiceList } from "@/components/MapExplorer";
import { SiteFooter } from "@/components/SiteChrome";
import { getChefs } from "@/lib/data";
import type { ServiceType } from "@/lib/types";

const SERVICES: ServiceType[] = ["home", "delivery", "pickup", "events", "meal_prep"];

const STEPS = [
  ["I.", "Explore o mapa", "Chefs da sua zona, com menus, preços e avaliações de quem já reservou."],
  ["II.", "Escolha o dia", "O calendário mostra só os dias livres. Peça a reserva sem criar conta."],
  ["III.", "Combine e receba", "O chef confirma, falam no chat e paga-lhe diretamente. Sem comissões."],
];

// [Placeholder quotes] Replace with real reviews once the first bookings complete.
const QUOTES = [
  ["Os meus pais ainda falam do arroz de pato. A Marta tratou de tudo.", "Sofia R. · Jantar em casa"],
  ["Deixámos de cozinhar ao domingo. As marmitas salvam-nos a semana.", "Miguel e Ana · Marmitas"],
  ["Encontrei a chef no mapa, a dez minutos de casa. Respondeu no mesmo dia.", "Pedro C. · Aniversário"],
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const { servico } = await searchParams;
  const filter = SERVICES.find((s) => s === servico);
  const chefs = await getChefs();

  return (
    <div>
      <MapExplorer chefs={chefs} filter={filter} />

      <section id="como" className="mx-auto flex max-w-[1240px] flex-col gap-14 px-5 pb-24 pt-28 md:px-8">
        <div className="al-rv flex flex-wrap items-end justify-between gap-6">
          <h2 className="d m-0 max-w-[700px] text-[clamp(38px,6vw,64px)] leading-none">Do mapa à sua mesa.</h2>
          <span className="lab text-muted">Como funciona</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-10 border-t border-ink">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="al-rv flex flex-col gap-2.5 border-b border-line pb-[30px] pt-[26px]">
              <span className="d text-lg italic">{n}</span>
              <strong className="text-[19px] font-semibold">{t}</strong>
              <span className="text-muted">{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto flex max-w-[1240px] flex-wrap gap-14 px-5 py-[104px] md:px-8">
          <div className="al-rv flex flex-[1_1_300px] flex-col gap-4">
            <span className="lab text-muted">A carta</span>
            <h2 className="d m-0 text-[clamp(38px,6vw,64px)] leading-none">O que pode pedir.</h2>
          </div>
          <ServiceList onPickHref />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-12 px-5 py-[104px] md:px-8">
        {QUOTES.map(([q, who]) => (
          <figure key={who} className="al-rv m-0 flex flex-col gap-[18px]">
            <blockquote className="d m-0 text-[26px] italic leading-[1.28]">“{q}”</blockquote>
            <figcaption className="lab text-muted">{who}</figcaption>
          </figure>
        ))}
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-24 md:px-8">
        <div className="al-rv flex flex-wrap items-center justify-between gap-6 border-y border-ink py-11">
          <div className="flex flex-col gap-1.5">
            <span className="d text-[clamp(28px,4vw,40px)] leading-[1.1]">É chef ou cozinha em casa?</span>
            <span className="text-muted">Receba pedidos e organize a agenda num só sítio.</span>
          </div>
          <Link href="/para-chefs" className="btn">
            Ao Lume para chefs
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
