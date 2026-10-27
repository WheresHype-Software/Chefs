"use client";

import { useEffect, useState } from "react";

// [Example data] Illustrative requests for the hero animation.
const REQ = [
  { who: "Sofia Ramos", what: "Jantar em casa · 6 pessoas · sáb.", note: "É o aniversário da minha mãe. Uma pessoa vegetariana.", exp: "9 h" },
  { who: "Miguel Antunes", what: "Marmitas · 10 refeições · segunda", note: "Podem ser sem lactose? Obrigado!", exp: "20 h" },
  { who: "Emma Clarke", what: "Evento · 16 pessoas · sáb.", note: "Birthday lunch with a Portuguese menu, please.", exp: "41 h" },
];
const TOASTS = ["Sofia deixou-lhe cinco estrelas", "Sinal de 99 € recebido por MB WAY", "Lembrete enviado ao cliente"];
const BUSY = [5, 6, 13, 14, 20, 27];

export function HeroStage() {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setK((x) => (x + 1) % 3), 3400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="al-in relative h-[500px] min-w-0 flex-[1_1_440px] md:h-[580px]" style={{ animationDelay: "220ms" }} aria-hidden="true">
      <div className="fabric absolute inset-0 rounded-[3px] border border-line" style={{ backgroundColor: "#F7F6F3" }} />
      <span className="lab absolute left-6 top-6 text-muted">Os seus pedidos</span>
      <span className="d absolute right-6 top-[18px] text-lg italic">Esta semana</span>
      {REQ.map((r, i) => {
        const pos = (i - k + 3) % 3;
        const st =
          pos === 0
            ? { transform: "translateX(-50%) translateY(0) scale(1)", opacity: 1, zIndex: 3 }
            : pos === 1
              ? { transform: "translateX(-50%) translateY(-30px) scale(0.95)", opacity: 0.6, zIndex: 2 }
              : { transform: "translateX(-50%) translateY(-56px) scale(0.9)", opacity: 0.25, zIndex: 1 };
        return (
          <article
            key={r.who}
            className="absolute left-1/2 top-[150px] box-border flex w-[380px] max-w-[calc(100%-48px)] flex-col gap-3.5 rounded-[3px] border border-line bg-white p-[22px] shadow-[0_22px_60px_rgba(17,17,16,.10)] transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] md:top-[170px]"
            style={st}
          >
            <div className="flex justify-between gap-2.5">
              <span className="lab">Novo pedido</span>
              <span className="num text-[13px] text-danger">expira em {r.exp}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="d text-2xl leading-[1.1]">{r.who}</span>
              <span className="text-[13px] text-muted">{r.what}</span>
            </div>
            <span className="border-l border-ink pl-3 text-sm text-ink-3">{r.note}</span>
            <div className="flex gap-2">
              <span className="btn !min-h-10 flex-1 !p-0">Aceitar</span>
              <span className="btn btn-o !min-h-10 flex-1 !p-0">Propor data</span>
            </div>
          </article>
        );
      })}
      <div className="al-float absolute bottom-6 left-6 box-border flex w-[210px] flex-col gap-2.5 rounded-[3px] border border-line bg-white p-3.5">
        <span className="lab">Agenda</span>
        <div className="grid grid-cols-7 gap-[3px]">
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className={`h-[18px] rounded-[1px] ${BUSY.includes(i + 1) ? "bg-ink" : "bg-[#EFEEEA]"}`} />
          ))}
        </div>
      </div>
      <div key={k} className="al-toast absolute bottom-[30px] right-6 hidden max-w-[220px] rounded-[2px] bg-ink px-4 py-3 text-[13px] text-white md:block">
        {TOASTS[k]}
      </div>
    </div>
  );
}

const BEFORE = [
  ["Pedidos", "Um formulário que poucos preenchem até ao fim."],
  ["Conversas", "Instagram, WhatsApp e SMS, tudo misturado."],
  ["Agenda", "Datas num caderno, ou de memória."],
  ["Confiança", "Clientes novos sem avaliações reais para ler."],
];
const AFTER = [
  ["Pedidos", "Uma página com menus, preços e reserva."],
  ["Conversas", "Um chat por reserva, com tudo registado."],
  ["Agenda", "Um calendário que mostra só os dias livres."],
  ["Confiança", "Avaliações de quem concluiu uma reserva."],
];

export function Compare() {
  const [after, setAfter] = useState(true);
  return (
    <section className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 pb-20 pt-[72px] md:px-10 md:pb-[120px]">
      <div className="al-rv flex flex-wrap items-end justify-between gap-6">
        <h2 className="d m-0 max-w-[720px] text-[clamp(38px,6vw,68px)] leading-none">Menos mensagens. Mais tempo na cozinha.</h2>
        <div role="group" aria-label="Comparar" className="flex rounded-[3px] border border-ink p-[3px]">
          <button type="button" className="seg" aria-pressed={!after} onClick={() => setAfter(false)}>
            Hoje
          </button>
          <button type="button" className="seg" aria-pressed={after} onClick={() => setAfter(true)}>
            Com Ao Lume
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] border-t border-ink">
        {(after ? AFTER : BEFORE).map(([k, v]) => (
          <div key={k} className="al-rv flex flex-col gap-3.5 border-b border-line pb-8 pr-6 pt-[26px]">
            <span className="lab text-muted">{k}</span>
            <span className={`d text-[26px] leading-[1.18] transition-opacity duration-500 ${after ? "text-ink" : "italic text-[#6B6862]"}`}>{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const TABS = [
  {
    label: "Página",
    title: "A sua montra, pronta a partilhar",
    text: "Fotos, menus, preços e avaliações num link curto que cabe na bio do Instagram.",
    points: ["Link próprio: aolume.pt/chef/o-seu-nome", "Preço fixo, por pessoa ou sob orçamento", "Pagamento e cancelamento visíveis para o cliente"],
  },
  {
    label: "Pedidos",
    title: "Aceitar, recusar ou propor outra data",
    text: "Cada pedido chega com data, número de pessoas, morada e restrições. Responde com um toque.",
    points: ["Os pedidos expiram em 48 horas", "Reserva concluída automaticamente no dia seguinte", "Avisos por email, e mais tarde por WhatsApp"],
  },
  {
    label: "Agenda",
    title: "Só recebe pedidos quando pode",
    text: "Marque os dias livres, bloqueie férias e defina até onde se desloca. Só aparece a clientes dentro da sua área.",
    points: ["Dias livres, reservados e bloqueados", "Raio de serviço em km ou locais específicos", "Sincronização com o Google Calendar no plano Pro"],
  },
  {
    label: "Chat",
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
      <div role="tablist" aria-label="Funcionalidades" className="box-border flex max-w-full flex-wrap gap-1 self-start rounded-[3px] border border-ink p-[3px]">
        {TABS.map((t, i) => (
          <button key={t.label} type="button" role="tab" className="seg" aria-selected={i === tab} onClick={() => setTab(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-wrap items-center gap-7 border-t border-ink pt-10 md:gap-12">
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
        <div className="box box-border flex min-h-[340px] min-w-0 flex-[1_1_420px] flex-col justify-center gap-3 p-[26px]" aria-hidden="true">
          {tab === 0 && (
            <div key="t0" className="al-in overflow-hidden rounded-[3px] border border-line">
              <div className="border-b border-line bg-paper px-3.5 py-2.5 text-[13px] text-ink-3">aolume.pt/chef/marta-figueiredo</div>
              <div className="h-[120px] bg-[#ECE8E1]" />
              <div className="flex flex-col gap-1.5 p-[18px]">
                <span className="lab text-muted">Profissional · Campo de Ourique</span>
                <span className="d text-[28px]">Marta Figueiredo</span>
                <span className="text-[13px] text-muted">★ 4,9 · desde 55 € por pessoa</span>
                <span className="btn btn-sm mt-2 self-start">Pedir reserva</span>
              </div>
            </div>
          )}
          {tab === 1 && (
            <div key="t1" className="al-in border-t border-ink">
              {[
                ["Sofia Ramos", "Jantar em casa · 6 pessoas", "Novo · 9 h", "bg-ink text-white"],
                ["Luís Antunes", "Mariscada · 4 pessoas", "Data proposta", "border border-ink"],
                ["Ana Pires", "Jantar do Minho · 8 pessoas", "Confirmado", "border border-line-3 text-muted"],
              ].map(([w, d, s, c]) => (
                <div key={w} className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line py-4">
                  <span className="flex flex-col">
                    <span className="d text-xl">{w}</span>
                    <span className="text-[13px] text-muted">{d}</span>
                  </span>
                  <span className={`lab rounded-[2px] px-2.5 py-1.5 ${c}`}>{s}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 2 && (
            <div key="t2" className="al-in flex flex-col gap-3.5">
              <div className="flex items-baseline justify-between border-b border-ink pb-2.5">
                <span className="d text-xl italic">Este mês</span>
                <span className="lab text-muted">Raio 15 km</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={`b${i}`} />
                ))}
                {Array.from({ length: 29 }, (_, i) => {
                  const d = i + 1;
                  const c = [6, 7, 14, 21, 22].includes(d)
                    ? "bg-ink text-white"
                    : [10, 11, 24].includes(d)
                      ? "text-faint line-through"
                      : "border border-line-3";
                  return (
                    <span key={d} className={`num flex h-9 items-center justify-center rounded-[2px] text-[13px] ${c}`}>
                      {d}
                    </span>
                  );
                })}
              </div>
              <span className="text-xs text-muted">Preenchido: reservado · Contorno: livre · Riscado: bloqueado</span>
            </div>
          )}
          {tab === 3 && (
            <div key="t3" className="al-in flex flex-col gap-2.5">
              <span className="max-w-[80%] self-start rounded-[3px] border border-line px-3.5 py-2.5 text-sm">Olá! Temos uma pessoa vegetariana, é possível?</span>
              <span className="max-w-[80%] self-end rounded-[3px] bg-ink px-3.5 py-2.5 text-sm text-white">Claro, faço um arroz de cogumelos em vez do pato.</span>
              <span className="lab self-center py-2 text-muted">Pedido aceite · sinal de 99 € combinado</span>
              <span className="max-w-[80%] self-start rounded-[3px] border border-line px-3.5 py-2.5 text-sm">Perfeito, já enviei por MB WAY.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
