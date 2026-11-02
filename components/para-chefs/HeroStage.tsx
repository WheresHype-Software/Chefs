"use client";

import { useEffect, useState } from "react";

// [Example data] Illustrative requests for the hero animation.
const REQ = [
  {
    who: "Sofia Ramos",
    what: "Jantar em casa · 6 pessoas · sáb.",
    note: "É o aniversário da minha mãe. Uma pessoa vegetariana.",
    exp: "9 h",
  },
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
      <span className="absolute left-6 top-6 text-[15px] font-semibold text-ink">Os seus pedidos</span>
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
            <span key={i} className={`h-[18px] rounded-[1px] ${BUSY.includes(i + 1) ? "bg-cobalt" : "bg-cobalt-soft"}`} />
          ))}
        </div>
      </div>
      <div
        key={k}
        className="al-toast absolute bottom-[30px] right-6 hidden max-w-[220px] rounded-[2px] bg-cobalt px-4 py-3 text-[13px] text-white md:block"
      >
        {TOASTS[k]}
      </div>
    </div>
  );
}
