"use client";

import { LumiSlot } from "@/components/dashboard/LumiCoach";
import { useState, useTransition } from "react";
import { openWeekdays, setDay, setWeeklyDays } from "@/app/dashboard/actions/agenda";
import { Chip } from "@/components/ui/Chip";
import { FormMessage, type FormMessageValue } from "@/components/ui/FormMessage";
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

/** Monday-first chips, as JS getDay() numbers. */
const CHIPS: [string, number][] = [
  ["Seg", 1],
  ["Ter", 2],
  ["Qua", 3],
  ["Qui", 4],
  ["Sex", 5],
  ["Sáb", 6],
  ["Dom", 0],
];
const PRESETS: [string, number[]][] = [
  ["Todos os dias", [0, 1, 2, 3, 4, 5, 6]],
  ["Fins de semana", [5, 6, 0]],
  ["Dias úteis", [1, 2, 3, 4, 5]],
];
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

type Overrides = Record<string, "available" | "blocked">;

/**
 * The chef's calendar: the days open every week (`weekly`), and per-day exceptions on top (an
 * extra day open, a day off). Tapping a day flips it; the weekly days are set once in the box
 * beside it and stay until changed.
 */
export function AgendaGrid({
  year,
  month,
  initial,
  weekly: initialWeekly,
  booked,
}: {
  year: number;
  month: number;
  initial: Overrides;
  /** Weekdays open every week, as JS getDay() (0 = Sunday). */
  weekly: number[];
  booked: string[];
}) {
  const [overrides, setOverrides] = useState<Overrides>(initial);
  const [weekly, setWeekly] = useState(initialWeekly);
  const [draft, setDraft] = useState(initialWeekly);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const today = isoDay(new Date());
  const bookedSet = new Set(booked);
  const monthName = new Date(year, month, 1).toLocaleDateString("pt-PT", { month: "long" });
  const dow = (iso: string) => new Date(`${iso}T12:00:00`).getDay();
  const isOpen = (iso: string) => (overrides[iso] ? overrides[iso] === "available" : weekly.includes(dow(iso)));
  const monthDays = Array.from({ length: count }, (_, i) => isoDay(new Date(year, month, i + 1)));
  const openCount = monthDays.filter((d) => d >= today && isOpen(d)).length;
  const changed = !same(draft, weekly);

  /** Runs a save; on failure puts the screen back as it was and says why. */
  function save(undo: () => void, run: () => Promise<ActionResult>, done?: string) {
    setMessage(null);
    start(async () => {
      const result = await callAction(run);
      if (!result.ok) {
        undo();
        setMessage({ ok: false, text: result.error });
      } else if (done) setMessage({ ok: true, text: done });
    });
  }

  function toggle(iso: string) {
    const before = overrides;
    const open = !isOpen(iso);
    const next = { ...overrides };
    // Back to what the weekday says: no exception needed.
    if (open === weekly.includes(dow(iso))) delete next[iso];
    else next[iso] = open ? "available" : "blocked";
    setOverrides(next);
    save(
      () => setOverrides(before),
      () => setDay(iso, open),
    );
  }

  function saveWeekly() {
    const before = weekly;
    setWeekly(draft);
    save(
      () => setWeekly(before),
      () => setWeeklyDays(draft),
      "Dias fixos guardados.",
    );
  }

  function openThisMonthOnly() {
    const before = overrides;
    const next = { ...overrides };
    for (const d of monthDays) if (d >= today && draft.includes(dow(d)) && !isOpen(d)) next[d] = "available";
    setOverrides(next);
    save(
      () => setOverrides(before),
      () => openWeekdays(year, month, draft),
      `Dias abertos em ${monthName}.`,
    );
  }

  const calendar = (
    <div data-lumi="calendario" className="box flex flex-col gap-4 p-4 md:p-5">
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
            const state: DayState = bookedSet.has(iso) ? "booked" : iso < today ? "past" : isOpen(iso) ? "open" : "closed";
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
      <LumiSlot name="calendario" />
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
          <span className="text-[14px] text-muted">
            Toque num dia para o abrir ou fechar; fica guardado logo. Fechar um dia fixo fecha só esse dia, e abrir outro dia abre só esse.
          </span>
        </div>

        <LumiSlot name="semana" />
        <section data-lumi="semana" aria-labelledby="dias-fixos" className="box flex flex-col gap-3.5 p-5">
          <div className="flex flex-col gap-0.5">
            <h2 id="dias-fixos" className="m-0 text-[17px] font-bold">
              Dias fixos
            </h2>
            <span className="text-[14px] text-muted">
              Os dias da semana em que costuma cozinhar. Ficam abertos todas as semanas, sem data de fim.
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Escolhas rápidas">
            {PRESETS.map(([label, days]) => (
              <Chip key={label} pressed={same(draft, days)} onClick={() => setDraft(same(draft, days) ? [] : days)}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="Dias da semana">
            {CHIPS.map(([label, d]) => (
              <Chip
                key={label}
                pressed={draft.includes(d)}
                onClick={() => setDraft(draft.includes(d) ? draft.filter((x) => x !== d) : [...draft, d])}
                className="!min-w-0 justify-center !px-0"
              >
                {label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm" disabled={!changed || pending} onClick={saveWeekly}>
              {draft.length === 0 && weekly.length > 0 ? "Deixar de ter dias fixos" : "Guardar dias fixos"}
            </button>
            {draft.length > 0 && (
              <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={openThisMonthOnly}>
                Abrir só em {monthName}
              </button>
            )}
          </div>
          <span className="text-[13px] text-muted">
            {weekly.length
              ? `Abertos todas as semanas: ${CHIPS.filter(([, d]) => weekly.includes(d))
                  .map(([l]) => l)
                  .join(", ")}. Para uma folga ou férias, feche esse dia no calendário.`
              : "Ainda sem dias fixos: só ficam abertos os dias que abrir no calendário."}
          </span>
        </section>
        <FormMessage message={message} />
      </div>
    </div>
  );
}
