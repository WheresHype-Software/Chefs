"use client";

import { useState } from "react";

// [Example data] A made-up request, played with the same buttons as the real dashboard.
const CLIENT = "Sofia Ramos";
const STEPS = [
  { title: "Chega um pedido", text: "O cliente escolhe o menu, o dia livre e escreve o que precisa. Recebe-o por email e no painel." },
  { title: "Aceita ou propõe outra data", text: "Tem 48 horas para responder. O cliente vê a resposta na página do pedido." },
  { title: "Combinam no chat", text: "Uma conversa por reserva: alergias, horários, morada. Tudo fica registado." },
  {
    title: "O cliente paga o sinal",
    text: "O cliente paga-lhe diretamente, por MB WAY, transferência ou dinheiro. A data fica marcada na agenda.",
  },
  { title: "Recebe a avaliação", text: "Depois do serviço, o cliente avalia. Só quem reservou pode avaliar, e pode responder." },
] as const;

const STATUS = ["Novo pedido", "Aceite", "Aceite", "Confirmada", "Concluída"];

function Bubble({ from, children }: { from: "client" | "chef"; children: React.ReactNode }) {
  return (
    <div
      className={`al-in max-w-[85%] rounded-[8px] px-3 py-2 text-[14px] ${from === "chef" ? "self-end bg-cobalt text-white" : "self-start border border-line bg-white"}`}
    >
      {children}
    </div>
  );
}

/** "Experimente": the visitor plays the chef and takes an example request from arrival to review. */
export function RequestDemo() {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
      <ol className="m-0 flex list-none flex-col p-0">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`flex gap-4 border-b border-line py-4 transition-opacity ${i > step ? "opacity-45" : ""}`}>
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
                i < step ? "bg-cobalt text-white" : i === step ? "border-2 border-cobalt text-cobalt" : "border border-line-3 text-faint"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <strong className="text-[17px]">
                {s.title}
                {i === step && <span className="sr-only"> (passo atual)</span>}
              </strong>
              {i === step && <span className="al-in text-[15px] text-ink-3">{s.text}</span>}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
          <span className="lab">Exemplo interativo · o seu painel</span>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-cobalt underline"
            >
              Recomeçar
            </button>
          )}
        </div>
        <article
          aria-live="polite"
          className="flex flex-col gap-4 rounded-[12px] border border-line bg-white p-5 shadow-[0_22px_60px_-24px_rgb(20_32_51/0.35)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[20px] font-bold">{CLIENT}</span>
              <span className="text-[14px] text-muted">Jantar em casa · 6 pessoas · sábado, 20:00</span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${step >= 3 ? "bg-cobalt text-white" : "bg-paper text-ink"}`}
            >
              {STATUS[step]}
            </span>
          </div>

          <div className="flex min-h-[150px] flex-col gap-2 rounded-[8px] bg-paper p-3">
            <Bubble from="client">É o aniversário da minha mãe. Uma pessoa é vegetariana.</Bubble>
            {step >= 2 && <Bubble from="chef">Combinado! Faço um arroz de cogumelos para ela. O sinal de 90 € é pago aqui na app.</Bubble>}
            {step >= 2 && <Bubble from="client">Perfeito, já enviei.</Bubble>}
            {step >= 3 && (
              <span className="al-in self-center rounded-full bg-cobalt-soft px-3 py-1 text-[12px] text-ink-3">
                Reserva confirmada · sábado na agenda
              </span>
            )}
            {step >= 4 && (
              <div className="al-in mt-1 flex flex-col gap-1 rounded-[8px] border border-line bg-white p-3">
                <span className="text-[14px] font-semibold text-cobalt">★★★★★ · Sofia R.</span>
                <span className="text-[14px] text-ink-3">«A minha mãe adorou. Tratou de tudo, até da loiça.»</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {step === 0 && (
              <>
                <button type="button" className="btn btn-sm" onClick={next}>
                  Aceitar
                </button>
                <span className="btn btn-sm btn-o pointer-events-none opacity-60">Propor outra data</span>
              </>
            )}
            {step === 1 && (
              <button type="button" className="btn btn-sm" onClick={next}>
                Abrir o chat
              </button>
            )}
            {step === 2 && (
              <button type="button" className="btn btn-sm" onClick={next}>
                Sinal recebido · confirmar
              </button>
            )}
            {step === 3 && (
              <button type="button" className="btn btn-sm" onClick={next}>
                Marcar concluída
              </button>
            )}
            {step === 4 && <span className="text-[14px] font-semibold text-ok">Assim corre uma reserva no Ao Lume.</span>}
          </div>
        </article>
      </div>
    </div>
  );
}
