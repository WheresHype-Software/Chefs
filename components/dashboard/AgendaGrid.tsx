"use client";

import { useState, useTransition } from "react";
import { openWeekdays, toggleDay } from "@/app/dashboard/actions/agenda";
import { Chip } from "@/components/ui/Chip";
import { FormMessage, type FormMessageValue } from "@/components/ui/FormMessage";
import { useToggleList } from "@/hooks/useToggleList";
import { callAction } from "@/lib/call-action";
import { isoDay } from "@/lib/format";
import type { ActionResult } from "@/lib/result";

type DayState = "open" | "closed" | "booked" | "past";

const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const CELL: Record<DayState, string> = {
  open: "border-ok bg-ok text-white hover:bg-[#185a3a]",
  closed: "border-line bg-white text-ink-3 hover:border-ok hover:text-ok",
  booked: "border-cobalt bg-cobalt text-white",
  past: "border-transparent bg-transparent text-faint",
};
const CELL_NOTE: Record<DayState, string> = { open: "Aberto", closed: "Fechado", booked: "Reserva", past: "" };

function Legend({ state, label }: { state: DayState; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded-[4px] border ${CELL[state]}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function AgendaGrid({
  year,
  month,
  initial,
  booked,
}: {
  year: number;
  month: number;
  initial: Record<string, "available" | "blocked">;
  booked: string[];
}) {
  // Only open days matter to clients; an old "blocked" day is simply closed.
  const [open, setOpen] = useState(() => new Set(Object.keys(initial).filter((d) => initial[d] === "available")));
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const weekdays = useToggleList<number>([]);
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const today = isoDay(new Date());
  const bookedSet = new Set(booked);
  const monthName = new Date(year, month, 1).toLocaleDateString("pt-PT", { month: "long" });
  const openCount = [...open].filter((d) => d >= today && d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length;

  /** Applies a change on screen at once and puts the previous days back if saving fails. */
  function save(next: Set<string>, run: () => Promise<ActionResult>) {
    const before = open;
    setOpen(next);
    setMessage(null);
    start(async () => {
      const result = await callAction(run);
      if (!result.ok) {
        setOpen(before);
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  function toggle(iso: string) {
    const next = new Set(open);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    save(next, () => toggleDay(iso));
  }

  function fillWeekdays() {
    const jsDays = weekdays.items.map((w) => (w + 1) % 7); // Monday-first index -> JS getDay()
    const next = new Set(open);
    for (let i = 1; i <= count; i++) {
      const dt = new Date(year, month, i);
      if (isoDay(dt) >= today && jsDays.includes(dt.getDay())) next.add(isoDay(dt));
    }
    save(next, () => openWeekdays(year, month, jsDays));
  }

  const calendar = (
    <div className="box flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold first-letter:uppercase">{monthName}</span>
        <span className="text-[13px] text-muted">
          {openCount} {openCount === 1 ? "dia aberto" : "dias abertos"}
        </span>
      </div>
      <div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted" aria-hidden="true">
          {WD.map((w) => (
            <span key={w}>{w.slice(0, 1)}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const iso = isoDay(new Date(year, month, i + 1));
            const state: DayState = bookedSet.has(iso) ? "booked" : iso < today ? "past" : open.has(iso) ? "open" : "closed";
            return (
              <button
                key={iso}
                type="button"
                disabled={state === "past" || state === "booked"}
                aria-pressed={state === "open"}
                onClick={() => toggle(iso)}
                className={`flex aspect-square items-center justify-center rounded-full border text-[14px] font-semibold tabular-nums transition-colors disabled:cursor-default ${CELL[state]} ${iso === today ? "underline decoration-2 underline-offset-4" : ""}`}
                aria-label={`${i + 1} de ${monthName}: ${state === "past" ? "passado" : CELL_NOTE[state].toLowerCase()}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[13px] text-ink-3">
        <Legend state="open" label="Aberto" />
        <Legend state="closed" label="Fechado" />
        <Legend state="booked" label="Com reserva" />
      </div>
    </div>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {calendar}

      <div className="flex flex-col gap-5">
        <div className="box flex flex-col gap-3 p-5">
          <span className="text-[17px] font-bold">Como funciona</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px] text-ink-3">
            <li>
              <strong className="font-semibold text-ok">Verde</strong>: dia aberto, os clientes podem pedir reserva.
            </li>
            <li>
              <strong className="font-semibold text-ink">Branco</strong>: dia fechado, ninguém consegue pedir.
            </li>
            <li>
              <strong className="font-semibold text-cobalt">Azul</strong>: já tem reserva nesse dia.
            </li>
          </ul>
          <span className="text-[14px] text-muted">Toque num dia para o abrir ou fechar. Fica guardado logo.</span>
        </div>

        <div className="box flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[17px] font-bold">Abrir vários dias de uma vez</span>
            <span className="text-[14px] text-muted">Escolha os dias da semana em que costuma cozinhar.</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WD.map((w, i) => (
              <Chip key={w} pressed={weekdays.has(i)} onClick={() => weekdays.toggle(i)}>
                {w}
              </Chip>
            ))}
          </div>
          <button type="button" className="btn btn-sm self-start" disabled={!weekdays.items.length || pending} onClick={fillWeekdays}>
            Abrir estes dias em {monthName}
          </button>
        </div>
        <FormMessage message={message} />
      </div>
    </div>
  );
}
