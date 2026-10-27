"use client";

import { saveCooking } from "@/app/dashboard/actions";
import { Chip } from "@/components/ui/Chip";
import { FormMessage } from "@/components/ui/FormMessage";
import { Switch } from "@/components/ui/Switch";
import { useServerAction } from "@/hooks/useServerAction";
import { useToggleList } from "@/hooks/useToggleList";
import { MAX_CATEGORIES } from "@/lib/constants";
import { SERVICE_LABEL } from "@/lib/format";
import type { ServiceType } from "@/lib/types";

const SERVICES: [ServiceType, string][] = [
  ["home", "Cozinha e serve em casa do cliente"],
  ["delivery", "Leva os pratos à morada do cliente"],
  ["pickup", "O cliente recolhe na sua cozinha"],
  ["events", "Grupos grandes, sob orçamento"],
  ["meal_prep", "Refeições para a semana"],
];

type Option = { id: number; name: string };

type Props = {
  categories: Option[];
  diets: Option[];
  mine: { categories: number[]; diets: number[]; services: ServiceType[] };
  preview: { name: string; tier: string; area: string; rating: string; from: string };
};

export function CookingForm({ categories, diets, mine, preview }: Props) {
  const cats = useToggleList(mine.categories, MAX_CATEGORIES);
  const chosenDiets = useToggleList(mine.diets);
  const services = useToggleList(mine.services);
  const { run, pending, message } = useServerAction(saveCooking, { successMessage: "Guardado." });
  const catLine =
    cats.items
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(" · ") || "Sem categoria";

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_460px] flex-col gap-3.5">
        <section className="box flex flex-col gap-3.5 p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="d m-0 text-2xl font-normal">Categorias de cozinha</h2>
            <span className="lab text-muted">
              {cats.items.length} de {MAX_CATEGORIES}
            </span>
          </div>
          <span className="text-sm text-muted">Escolha até três. Os clientes filtram a pesquisa por estas categorias.</span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Chip key={c.id} pressed={cats.has(c.id)} disabled={!cats.has(c.id) && !cats.canAdd} onClick={() => cats.toggle(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </section>

        <section className="box flex flex-col gap-1 p-6">
          <h2 className="d mb-2 mt-0 text-2xl font-normal">Serviços que oferece</h2>
          {SERVICES.map(([key, description]) => (
            <div key={key} className="flex items-center justify-between gap-4 border-t border-line py-3.5">
              <span className="flex flex-col">
                <strong className="font-semibold">{SERVICE_LABEL[key]}</strong>
                <span className="text-[13px] text-muted">{description}</span>
              </span>
              <Switch checked={services.has(key)} label={SERVICE_LABEL[key]} onChange={() => services.toggle(key)} />
            </div>
          ))}
        </section>

        <section className="box flex flex-col gap-3.5 p-6">
          <h2 className="d m-0 text-2xl font-normal">Dietas que consegue fazer</h2>
          <div className="flex flex-wrap gap-1.5">
            {diets.map((d) => (
              <Chip key={d.id} pressed={chosenDiets.has(d.id)} onClick={() => chosenDiets.toggle(d.id)}>
                {d.name}
              </Chip>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
        <span className="lab text-muted">Como aparece na pesquisa</span>
        <div className="box flex gap-3.5 p-2.5">
          <span className="h-[150px] flex-[0_0_88px] rounded-[2px] bg-cobalt-soft" aria-hidden="true" />
          <span className="flex min-w-0 flex-col gap-[3px] py-1 pr-1">
            <span className="lab text-muted">{preview.tier}</span>
            <span className="d text-[22px] leading-[1.1]">{preview.name}</span>
            <span className="text-[13px] text-muted">
              {catLine} · {preview.area}
            </span>
            <span className="text-[13px] text-muted">{services.items.map((s) => SERVICE_LABEL[s]).join(" · ")}</span>
            <span className="mt-auto text-[13px]">
              <strong className="font-semibold">{preview.rating}</strong> · desde {preview.from}
            </span>
          </span>
        </div>
        <span className="text-[13px] text-muted">As alterações aparecem na pesquisa assim que guardar.</span>
        <button type="button" className="btn" disabled={pending} onClick={() => run(cats.items, chosenDiets.items, services.items)}>
          Guardar alterações
        </button>
        <FormMessage message={message} />
      </aside>
    </div>
  );
}
