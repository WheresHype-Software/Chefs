"use client";

import { useState } from "react";
import { deleteOffer, saveOffer } from "@/app/dashboard/actions/offers";
import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/NumberInput";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { DashOffer } from "@/lib/dashboard";

/** `onDone(true)` after a save, `onDone(false)` after delete or cancel. */
export function OfferForm({ offer, onDone }: { offer: DashOffer; onDone: (saved: boolean) => void }) {
  const [o, setOffer] = useState(offer);
  const [slots, setSlots] = useState(offer.time_slots.join(", "));
  const save = useServerAction(saveOffer, { onSuccess: () => onDone(true) });
  const remove = useServerAction(deleteOffer, { onSuccess: () => onDone(false) });
  const pending = save.pending || remove.pending;
  const set = <K extends keyof DashOffer>(key: K, value: DashOffer[K]) => setOffer((p) => ({ ...p, [key]: value }));

  function submit() {
    save.run({
      ...o,
      id: o.id || undefined,
      description: o.description ?? undefined,
      time_slots: slots
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return (
    <form
      className="box flex min-w-0 flex-[2_1_340px] flex-col gap-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="d m-0 text-2xl font-normal">{o.id ? "Editar oferta" : "Nova oferta"}</h2>
      <Field label="Título">
        <input required maxLength={120} value={o.title} onChange={(e) => set("title", e.target.value)} placeholder="Jantar do Minho" />
      </Field>
      <Field label="Descrição">
        <textarea
          rows={2}
          maxLength={1000}
          value={o.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Pratos, tempos, o que inclui"
        />
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3.5">
        <Field label="Onde">
          <select value={o.fulfilment_mode} onChange={(e) => set("fulfilment_mode", e.target.value as DashOffer["fulfilment_mode"])}>
            <option value="home">Em casa do cliente</option>
            <option value="delivery">Entrega</option>
            <option value="pickup">Levantamento</option>
          </select>
        </Field>
        <Field label="Preço">
          <select value={o.price_model} onChange={(e) => set("price_model", e.target.value as DashOffer["price_model"])}>
            <option value="per_person">Por pessoa / unidade</option>
            <option value="fixed">Fixo</option>
            <option value="quote">Sob orçamento</option>
          </select>
        </Field>
        {o.price_model !== "quote" && (
          <Field label="Valor (€)">
            <NumberInput decimal min={0} value={o.price} onChange={(v) => set("price", v)} />
          </Field>
        )}
        <Field label="Unidade">
          <input
            maxLength={30}
            value={o.unit_label}
            onChange={(e) => set("unit_label", e.target.value)}
            placeholder="pessoa, refeição, bolo"
          />
        </Field>
        <Field label="Mínimo">
          <NumberInput min={1} max={500} emptyValue={1} value={o.min_guests} onChange={(v) => set("min_guests", v ?? 1)} />
        </Field>
        <Field label="Máximo">
          <NumberInput min={1} max={500} value={o.max_guests} onChange={(v) => set("max_guests", v)} placeholder="Sem limite" />
        </Field>
        <Field label="Antecedência (horas)">
          <NumberInput min={0} max={720} emptyValue={0} value={o.lead_time_hours} onChange={(v) => set("lead_time_hours", v ?? 0)} />
        </Field>
        <Field label="Horas (separadas por vírgula)">
          <input value={slots} onChange={(e) => setSlots(e.target.value)} placeholder="13:00, 20:00" />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={o.active} onChange={(e) => set("active", e.target.checked)} className="accent-ink" />
        Visível no perfil e nas pesquisas
      </label>
      <FormMessage message={save.message ?? remove.message} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-sm" disabled={pending}>
          Guardar
        </button>
        <button type="button" className="btn btn-sm btn-o" onClick={() => onDone(false)}>
          Fechar
        </button>
        {o.id && (
          <button
            type="button"
            className="btn btn-sm btn-o !border-line-2 !text-danger"
            disabled={pending}
            onClick={() => confirm("Apagar esta oferta?") && remove.run(o.id)}
          >
            Apagar
          </button>
        )}
      </div>
    </form>
  );
}
