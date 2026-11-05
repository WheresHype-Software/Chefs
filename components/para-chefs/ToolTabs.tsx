"use client";

import { useState } from "react";
import agendaShot from "@/public/para-chefs/agenda.png";
import avaliacoesShot from "@/public/para-chefs/avaliacoes.png";
import conversaShot from "@/public/para-chefs/conversa.png";
import paginaShot from "@/public/para-chefs/pagina.png";
import pedidosShot from "@/public/para-chefs/pedidos.png";
import { AppShot } from "./AppShot";
import { BrowserShot } from "./BrowserShot";
import { SITE_DOMAIN } from "@/lib/constants";

const TABS = [
  {
    label: "Página",
    shot: paginaShot,
    browser: "/chef/marta-figueiredo",
    alt: "O topo da página pública de uma chef: cinco fotografias de pratos, o nome, as marcas de verificação e a caixa de pedir reserva.",
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
    shot: pedidosShot,
    alt: "A lista de pedidos no telemóvel, cada um com data, pessoas, valor e os botões de aceitar, propor alteração ou recusar.",
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
    shot: agendaShot,
    alt: "O calendário de disponibilidade no telemóvel, com dias abertos a verde, fechados a branco e com reserva a azul.",
    title: "Só recebe pedidos quando pode",
    text: "Marque os dias livres, bloqueie férias e defina até onde se desloca. Só aparece a clientes dentro da sua área.",
    points: [
      "Dias livres, reservados e bloqueados",
      "Raio de serviço em km ou locais específicos",
      "Abra de uma vez os dias da semana em que cozinha",
    ],
  },
  {
    label: "Conversa",
    shot: conversaShot,
    alt: "A conversa de uma reserva no telemóvel, com as mensagens do cliente e do chef e a caixa de escrita.",
    title: "Tudo combinado num só sítio",
    text: "Menu, alergias, sinal e hora de chegada ficam na conversa da reserva.",
    points: ["Uma conversa por reserva", "Partilha de fotos e menus", "Histórico sempre disponível"],
  },
  {
    label: "Avaliações",
    shot: avaliacoesShot,
    alt: "As avaliações recebidas no telemóvel, com estrelas, o nome do cliente e a resposta do chef.",
    title: "A reputação fica consigo",
    text: "Só quem concluiu uma reserva avalia. Responde uma vez a cada avaliação e denuncia as abusivas.",
    points: ["Só de clientes com reserva concluída", "Uma resposta pública sua por avaliação", "Média e total visíveis no seu perfil"],
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
        <div className={`flex min-w-0 flex-col items-center gap-3.5 ${cur.browser ? "flex-[1_1_520px]" : "flex-[1_1_340px]"}`}>
          {cur.browser ? (
            <BrowserShot key={tab} src={cur.shot} alt={cur.alt} url={cur.browser} />
          ) : (
            <AppShot key={tab} src={cur.shot} alt={cur.alt} />
          )}
          <span className="text-[13px] text-muted">Ecrãs da aplicação, com dados de demonstração.</span>
        </div>
      </div>
    </>
  );
}
