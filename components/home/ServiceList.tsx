import Link from "next/link";
import type { ServiceType } from "@/lib/types";

const SERVICES: [ServiceType, string, string][] = [
  ["home", "Chef em casa", "Jantares e datas especiais, cozinhados e servidos na sua cozinha."],
  ["meal_prep", "Marmitas da semana", "Refeições caseiras para os dias de trabalho, entregues ou para levantar."],
  ["delivery", "Entrega", "Pratos do chef levados até à sua porta."],
  ["pickup", "Pastelaria e levantamento", "Bolos de aniversário, tartes e doces de época por encomenda."],
  ["events", "Eventos", "Aniversários, batizados e jantares de empresa, com orçamento à medida."],
];

/** "O que pode pedir" list; each row filters the map by that service. */
export function ServiceList() {
  return (
    <div className="min-w-0 flex-[2_1_520px] border-t border-ink">
      {SERVICES.map(([key, title, text]) => (
        <Link
          key={key}
          href={`/?servico=${key}#mapa`}
          scroll={false}
          className="al-rv flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line py-[26px] text-ink no-underline transition-[padding] duration-300 hover:pl-3"
        >
          <span className="d text-[clamp(26px,4vw,36px)] leading-[1.1]">{title}</span>
          <span className="max-w-[360px] text-[15px] text-muted">{text}</span>
        </Link>
      ))}
    </div>
  );
}
