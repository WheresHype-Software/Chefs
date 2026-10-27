"use client";

import { isoDay, monthLabel } from "@/lib/format";
import type { Calendar } from "@/lib/types";

type Props = {
  year: number;
  month: number; // 0-based
  calendar: Calendar | null;
  selected: string | null;
  onSelect: (iso: string) => void;
  onMonth: (delta: number) => void;
  canPrev: boolean;
};

const WD = ["S", "T", "Q", "Q", "S", "S", "D"];

export function MonthCalendar({ year, month, calendar, selected, onSelect, onMonth, canPrev }: Props) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const available = new Set(calendar?.available ?? []);
  const booked = new Set(calendar?.booked ?? []);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between border-b border-ink pb-2.5">
        <h3 className="lab m-0">Data</h3>
        <div className="flex items-center gap-2">
          <button type="button" className="ctl !h-8 !w-8 !text-sm" onClick={() => onMonth(-1)} disabled={!canPrev} aria-label="Mês anterior">
            ‹
          </button>
          <span className="d min-w-36 text-center text-base italic">{monthLabel(year, month)}</span>
          <button type="button" className="ctl !h-8 !w-8 !text-sm" onClick={() => onMonth(1)} aria-label="Mês seguinte">
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[.1em] text-muted" aria-hidden="true">
        {WD.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" aria-busy={!calendar}>
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const iso = isoDay(new Date(year, month, i + 1));
          const a = available.has(iso);
          const b = booked.has(iso);
          const s = selected === iso ? "x" : a ? "a" : b ? "b" : "o";
          return (
            <button
              key={iso}
              type="button"
              className="cal-day"
              data-s={s}
              disabled={!a}
              onClick={() => a && onSelect(iso)}
              aria-label={`${i + 1}${a ? ", disponível" : b ? ", reservado" : ", indisponível"}`}
              aria-pressed={selected === iso}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted">Com contorno: disponível · Riscado: já reservado</span>
    </div>
  );
}
