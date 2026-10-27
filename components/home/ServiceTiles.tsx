import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { SERVICE_PHOTO } from "@/lib/photos";
import type { ServiceType } from "@/lib/types";

const SERVICES: [ServiceType, string, string][] = [
  ["home", "Chef em casa", "Jantares e datas especiais, cozinhados e servidos na sua cozinha."],
  ["meal_prep", "Marmitas da semana", "Refeições caseiras para os dias de trabalho."],
  ["pickup", "Bolos e encomendas", "Pastelaria e doces de época para levantar."],
  ["delivery", "Entrega", "Pratos do chef levados até à sua porta."],
  ["events", "Eventos", "Aniversários, batizados e jantares de empresa."],
];

/** What you can order, as photo tiles; each opens a filtered search. */
export function ServiceTiles() {
  return (
    <section aria-labelledby="servicos-title" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-24">
      <h2 id="servicos-title" className="d m-0 mb-8 text-[clamp(28px,3.4vw,40px)] leading-[1.05]">
        O que pode pedir
      </h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5">
        {SERVICES.map(([key, title, text], i) => (
          <li key={key} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>
            <Link href={`/procurar?servico=${key}`} className="group flex flex-col gap-3 text-ink no-underline hover:text-ink">
              <div className="aspect-[4/5] overflow-hidden rounded-[10px] bg-paper">
                <Photo
                  photo={SERVICE_PHOTO[key]}
                  sizes="(min-width: 1024px) 20vw, 50vw"
                  className="h-full w-full transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.01em] group-hover:text-cobalt">
                  {title}
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
                <span className="text-[15px] text-muted">{text}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
