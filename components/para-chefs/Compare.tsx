"use client";

import { useState } from "react";

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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] border-t border-line-2">
        {(after ? AFTER : BEFORE).map(([k, v]) => (
          <div key={k} className="al-rv flex flex-col gap-3.5 border-b border-line pb-8 pr-6 pt-[26px]">
            <span className="lab text-muted">{k}</span>
            <span className={`d text-[26px] leading-[1.18] transition-opacity duration-500 ${after ? "text-ink" : "text-muted"}`}>{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
