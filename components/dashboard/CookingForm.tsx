"use client";

import { useState, useTransition } from "react";
import { saveCooking } from "@/app/dashboard/actions";
import { SERVICE_LABEL } from "@/lib/format";
import type { ServiceType } from "@/lib/types";

const SERVICES: [ServiceType, string][] = [
  ["home", "Cozinha e serve em casa do cliente"],
  ["delivery", "Leva os pratos à morada do cliente"],
  ["pickup", "O cliente recolhe na sua cozinha"],
  ["events", "Grupos grandes, sob orçamento"],
  ["meal_prep", "Refeições para a semana"],
];

type Props = {
  categories: { id: number; name: string }[];
  diets: { id: number; name: string }[];
  mine: { categories: number[]; diets: number[]; services: ServiceType[] };
  preview: { name: string; tier: string; area: string; rating: string; from: string };
};

export function CookingForm({ categories, diets, mine, preview }: Props) {
  const [cats, setCats] = useState(mine.categories);
  const [ds, setDs] = useState(mine.diets);
  const [svc, setSvc] = useState(mine.services);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const catLine = cats.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean).join(" · ") || "Sem categoria";

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_460px] flex-col gap-3.5">
        <section className="box flex flex-col gap-3.5 p-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="d text-2xl">Categorias de cozinha</span>
            <span className="lab text-muted">{cats.length} de 3</span>
          </div>
          <span className="text-sm text-muted">Escolha até três. Os clientes filtram o mapa por estas categorias.</span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const on = cats.includes(c.id);
              return (
                <button key={c.id} type="button" className="chip" aria-pressed={on} disabled={!on && cats.length >= 3} onClick={() => setCats((l) => toggle(l, c.id))}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="box flex flex-col gap-1 p-6">
          <span className="d mb-2 text-2xl">Serviços que oferece</span>
          {SERVICES.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-4 border-t border-line py-3.5">
              <span className="flex flex-col">
                <strong className="font-semibold">{SERVICE_LABEL[k]}</strong>
                <span className="text-[13px] text-muted">{d}</span>
              </span>
              <button type="button" className="sw" role="switch" aria-checked={svc.includes(k)} aria-label={SERVICE_LABEL[k]} onClick={() => setSvc((l) => toggle(l, k))} />
            </div>
          ))}
        </section>

        <section className="box flex flex-col gap-3.5 p-6">
          <span className="d text-2xl">Dietas que consegue fazer</span>
          <div className="flex flex-wrap gap-1.5">
            {diets.map((d) => (
              <button key={d.id} type="button" className="chip" aria-pressed={ds.includes(d.id)} onClick={() => setDs((l) => toggle(l, d.id))}>
                {d.name}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
        <span className="lab text-muted">Como aparece no mapa</span>
        <div className="box flex gap-3.5 p-2.5">
          <span className="h-[150px] flex-[0_0_88px] rounded-[2px] bg-[#ECE9E3]" aria-hidden="true" />
          <span className="flex min-w-0 flex-col gap-[3px] py-1 pr-1">
            <span className="lab text-muted">{preview.tier}</span>
            <span className="d text-[22px] leading-[1.1]">{preview.name}</span>
            <span className="text-[13px] text-muted">
              {catLine} · {preview.area}
            </span>
            <span className="text-[13px] text-muted">{svc.map((s) => SERVICE_LABEL[s]).join(" · ")}</span>
            <span className="mt-auto text-[13px]">
              <strong className="font-semibold">{preview.rating}</strong> · desde {preview.from}
            </span>
          </span>
        </div>
        <span className="text-[13px] text-muted">As alterações aparecem no mapa assim que guardar.</span>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveCooking(cats, ds, svc);
              setMsg(r.ok ? "Guardado." : r.error);
            })
          }
        >
          Guardar alterações
        </button>
        {msg && (
          <p role="status" className="m-0 text-sm text-muted">
            {msg}
          </p>
        )}
      </aside>
    </div>
  );
}
