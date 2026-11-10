"use client";

import { useId, useState } from "react";
import { Chip } from "@/components/ui/Chip";

/** The server takes up to 12 (actions/offers.ts). */
const MAX = 12;

const GROUPS: [string, string[]][] = [
  ["Almoço", ["12:00", "12:30", "13:00", "13:30"]],
  ["Jantar", ["19:00", "19:30", "20:00", "20:30", "21:00"]],
];
const PRESETS = new Set(GROUPS.flatMap(([, times]) => times));

const sort = (list: string[]) => [...new Set(list)].sort();

/**
 * The hours a client can pick for an offer: a tap on the usual lunch and dinner times, and any
 * other hour from a time field. Replaces typing "13:00, 20:00" by hand, which was easy to get
 * wrong and hard on a phone. Without any, clients are offered 13:00 and 20:00 (TimeSlots).
 */
export function TimeSlotPicker({ value, onChange }: { value: string[]; onChange: (slots: string[]) => void }) {
  const [other, setOther] = useState("");
  const id = useId();
  const full = value.length >= MAX;
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((v) => v !== t) : sort([...value, t]));
  const custom = value.filter((t) => !PRESETS.has(t));

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" data-lumi="oferta-horas">
      <legend className="field lab mb-1 p-0">Horas a que pode servir</legend>
      {GROUPS.map(([label, times]) => (
        <div key={label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="w-16 shrink-0 text-[13px] text-muted">{label}</span>
          <div className="flex flex-wrap gap-1.5">
            {times.map((t) => (
              <Chip key={t} pressed={value.includes(t)} disabled={full && !value.includes(t)} onClick={() => toggle(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      {custom.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="w-16 shrink-0 text-[13px] text-muted">Outras</span>
          <div className="flex flex-wrap gap-1.5">
            {custom.map((t) => (
              <Chip key={t} pressed onClick={() => toggle(t)} aria-label={`Retirar ${t}`}>
                {t} <span aria-hidden="true">×</span>
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-[13px] text-muted">
          Outra hora
        </label>
        <input
          id={id}
          type="time"
          step={900}
          value={other}
          onChange={(e) => setOther(e.target.value)}
          className="chip w-[7.5rem] cursor-text"
        />
        <button
          type="button"
          className="btn btn-o btn-sm min-h-11"
          disabled={!other || full || value.includes(other)}
          onClick={() => {
            toggle(other);
            setOther("");
          }}
        >
          Acrescentar
        </button>
      </div>
      <span className="hint">
        {value.length === 0
          ? "Sem horas escolhidas, os clientes podem pedir às 13:00 ou às 20:00."
          : full
            ? `Máximo de ${MAX} horas.`
            : `${value.length} ${value.length === 1 ? "hora escolhida" : "horas escolhidas"}: ${value.join(", ")}.`}
      </span>
    </fieldset>
  );
}
