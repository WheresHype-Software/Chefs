"use client";

import { useState } from "react";
import { deleteOffer, saveOffer } from "@/app/dashboard/actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { DashOffer } from "@/lib/dashboard";
import { MODE_LABEL, offerPriceLabel } from "@/lib/format";

const EMPTY_OFFER: DashOffer = {
  id: "",
  title: "",
  description: "",
  fulfilment_mode: "home",
  price_model: "per_person",
  price: null,
  unit_label: "pessoa",
  min_guests: 2,
  max_guests: 12,
  lead_time_hours: 48,
  time_slots: ["13:00", "20:00"],
  active: true,
};

const toNumber = (v: string) => Number(v.replace(",", "."));

function OfferRow({ offer, onEdit }: { offer: DashOffer; onEdit: () => void }) {
  return (
    <article className={`box flex flex-wrap justify-between gap-4 p-5 ${offer.active ? "" : "opacity-50"}`}>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
        <span className="lab text-muted">
          {MODE_LABEL[offer.fulfilment_mode]}
          {offer.active ? "" : " · inativa"}
        </span>
        <h2 className="d m-0 text-2xl font-normal leading-[1.15]">{offer.title}</h2>
        {offer.description && <span className="text-sm text-muted">{offer.description}</span>}
        <span className="text-[13px] text-muted">
          {offer.min_guests}–{offer.max_guests ?? "∞"} · reservar com {offer.lead_time_hours} h · {offer.time_slots.join(", ")}
        </span>
      </div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
        <span className="num font-semibold">
          {offerPriceLabel({ priceModel: offer.price_model, price: offer.price, unit: offer.unit_label })}
        </span>
        <button type="button" className="btn btn-sm btn-o" onClick={onEdit}>
          Editar
        </button>
      </div>
    </article>
  );
}

/** The chef's offers with an inline editor for creating and changing them. */
export function OfferList({ offers }: { offers: DashOffer[] }) {
  const [editing, setEditing] = useState<DashOffer | null>(null);
  return (
    <div className="flex flex-wrap items-start gap-6">
      <section className="flex min-w-0 flex-[3_1_420px] flex-col gap-3.5">
        {offers.length === 0 && (
          <p className="m-0 text-muted">Ainda não tem ofertas. Crie a primeira: um menu, uma caixa, uma encomenda.</p>
        )}
        {offers.map((o) => (
          <OfferRow key={o.id} offer={o} onEdit={() => setEditing(o)} />
        ))}
        <button type="button" className="btn self-start" onClick={() => setEditing({ ...EMPTY_OFFER })}>
          Nova oferta
        </button>
      </section>
      {editing && <OfferForm key={editing.id || "new"} offer={editing} onDone={() => setEditing(null)} />}
    </div>
  );
}

function OfferForm({ offer, onDone }: { offer: DashOffer; onDone: () => void }) {
  const [o, setOffer] = useState(offer);
  const [slots, setSlots] = useState(offer.time_slots.join(", "));
  const save = useServerAction(saveOffer, { onSuccess: onDone });
  const remove = useServerAction(deleteOffer, { onSuccess: onDone });
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
      <div className="grid grid-cols-2 gap-3.5">
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
            <input
              inputMode="decimal"
              value={o.price ?? ""}
              onChange={(e) => set("price", e.target.value ? toNumber(e.target.value) : null)}
            />
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
          <input inputMode="numeric" value={o.min_guests} onChange={(e) => set("min_guests", Number(e.target.value) || 1)} />
        </Field>
        <Field label="Máximo">
          <input
            inputMode="numeric"
            value={o.max_guests ?? ""}
            onChange={(e) => set("max_guests", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Antecedência (horas)">
          <input inputMode="numeric" value={o.lead_time_hours} onChange={(e) => set("lead_time_hours", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Horas (separadas por vírgula)">
          <input value={slots} onChange={(e) => setSlots(e.target.value)} placeholder="13:00, 20:00" />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={o.active} onChange={(e) => set("active", e.target.checked)} className="accent-ink" />
        Visível no perfil e no mapa
      </label>
      <FormMessage message={save.message ?? remove.message} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-sm" disabled={pending}>
          Guardar
        </button>
        <button type="button" className="btn btn-sm btn-o" onClick={onDone}>
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
