"use client";

import { useState } from "react";
import { AgendaPreview, ChatPreview, PagePreview, RequestsPreview } from "./ToolPreviews";
import { SITE_DOMAIN } from "@/lib/constants";

const TABS = [
  {
    label: "Página",
    Preview: PagePreview,
    title: "A sua montra, pronta a partilhar",
    text: "Fotos, menus, preços e avaliações num link curto que cabe na bio do Instagram.",
    points: [
      `Link próprio: ${SITE_DOMAIN}/chef/o-seu-nome`,
      "Preço fixo, por pessoa ou sob orçamento",
      "Pagamento e cancelamento visíveis para o cliente",
    ],
  },
  {
    label: "Pedidos",
    Preview: RequestsPreview,
    title: "Aceitar, recusar ou propor outra data",
    text: "Cada pedido chega com data, número de pessoas, morada e restrições. Responde com um toque.",
    points: [
      "Os pedidos expiram em 48 horas",
      "Reserva concluída automaticamente no dia seguinte",
      "Avisos por email, e mais tarde por WhatsApp",
    ],
  },
  {
    label: "Agenda",
    Preview: AgendaPreview,
    title: "Só recebe pedidos quando pode",
    text: "Marque os dias livres, bloqueie férias e defina até onde se desloca. Só aparece a clientes dentro da sua área.",
    points: [
      "Dias livres, reservados e bloqueados",
      "Raio de serviço em km ou locais específicos",
      "Abra de uma vez os dias da semana em que cozinha",
    ],
  },
  {
    label: "Chat",
    Preview: ChatPreview,
    title: "Tudo combinado num só sítio",
    text: "Menu, alergias, sinal e hora de chegada ficam na conversa da reserva.",
    points: ["Uma conversa por reserva", "Partilha de fotos e menus", "Histórico sempre disponível"],
  },
];

export function ToolTabs() {
  const [tab, setTab] = useState(0);
  const cur = TABS[tab]!;
  return (
    <>
      <div
        role="tablist"
        aria-label="Funcionalidades"
        className="box-border flex max-w-full flex-wrap gap-1 self-start rounded-[3px] border border-ink p-[3px]"
      >
        {TABS.map((t, i) => (
          <button key={t.label} type="button" role="tab" className="seg" aria-selected={i === tab} onClick={() => setTab(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-wrap items-center gap-7 border-t border-line-2 pt-10 md:gap-12">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-[18px]">
          <h3 className="d m-0 text-[clamp(30px,4vw,44px)] leading-[1.04]">{cur.title}</h3>
          <p className="m-0 text-[17px] text-ink-3">{cur.text}</p>
          <ul className="m-0 list-none border-t border-line-2 p-0">
            {cur.points.map((p) => (
              <li key={p} className="border-b border-line-2 py-3.5 text-[15px]">
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div
          className="box box-border flex min-h-[340px] min-w-0 flex-[1_1_420px] flex-col justify-center gap-3 p-[26px]"
          aria-hidden="true"
        >
          <cur.Preview key={tab} />
        </div>
      </div>
    </>
  );
}
