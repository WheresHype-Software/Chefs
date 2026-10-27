"use client";

import { useState, useTransition } from "react";
import { cycleDay, openWeekdays } from "@/app/dashboard/actions";
import { Chip } from "@/components/ui/Chip";
import { useToggleList } from "@/hooks/useToggleList";
import { isoDay } from "@/lib/format";

type DayState = "available" | "blocked" | "booked" | undefined;

const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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
  const [days, setDays] = useState(initial);
  const [pending, start] = useTransition();
  const weekdays = useToggleList<number>([]);
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const today = isoDay(new Date());
  const bookedSet = new Set(booked);

  function cycle(iso: string) {
    setDays((d) => {
      const next = { ...d };
      if (!d[iso]) next[iso] = "available";
      else if (d[iso] === "available") next[iso] = "blocked";
      else delete next[iso];
      return next;
    });
    start(async () => {
      await cycleDay(iso);
    });
  }

  function fillWeekdays() {
    const jsDays = weekdays.items.map((w) => (w + 1) % 7); // Monday-first index -> JS getDay()
    setDays((d) => {
      const next = { ...d };
      for (let i = 1; i <= count; i++) {
        const dt = new Date(year, month, i);
        const iso = isoDay(dt);
        if (iso >= today && jsDays.includes(dt.getDay()) && !next[iso]) next[iso] = "available";
      }
      return next;
    });
    start(async () => {
      await openWeekdays(year, month, jsDays);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="box flex flex-col gap-3 p-[22px]">
        <span className="d text-[22px]">Abrir dias da semana</span>
        <div className="flex flex-wrap gap-1.5">
          {WD.map((w, i) => (
            <Chip key={w} pressed={weekdays.has(i)} onClick={() => weekdays.toggle(i)}>
              {w}
            </Chip>
          ))}
          <button type="button" className="btn btn-sm" disabled={!weekdays.items.length || pending} onClick={fillWeekdays}>
            Marcar disponíveis este mês
          </button>
        </div>
      </div>

      <div className="box p-[22px]">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[.1em] text-muted" aria-hidden="true">
          {WD.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const iso = isoDay(new Date(year, month, i + 1));
            const state: DayState = bookedSet.has(iso) ? "booked" : days[iso];
            const past = iso < today;
            const style =
              state === "booked"
                ? "bg-ink text-white border-ink"
                : state === "available"
                  ? "border-line-3 font-semibold"
                  : state === "blocked"
                    ? "text-faint line-through border-transparent"
                    : "border-transparent text-[#A9A59E]";
            return (
              <button
                key={iso}
                type="button"
                disabled={past || state === "booked"}
                onClick={() => cycle(iso)}
                className={`num flex h-12 items-center justify-center rounded-[2px] border text-sm transition hover:border-ink disabled:cursor-default disabled:hover:border-transparent ${style} ${past ? "opacity-40" : ""}`}
                aria-label={`${i + 1}: ${state === "booked" ? "reservado" : state === "available" ? "disponível" : state === "blocked" ? "bloqueado" : "fechado"}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="mb-0 mt-3 text-xs text-muted">
          Toque num dia para o abrir, bloquear ou fechar. Preenchido: reservado · Contorno: disponível · Riscado: bloqueado.
        </p>
      </div>
    </div>
  );
}
