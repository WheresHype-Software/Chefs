"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteOffer, saveOffer } from "@/app/dashboard/actions";
import type { DashOffer } from "@/lib/dashboard";
import { MODE_LABEL, offerPriceLabel } from "@/lib/format";

const EMPTY: DashOffer = {
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

export function OfferList({ offers }: { offers: DashOffer[] }) {
  const [editing, setEditing] = useState<DashOffer | null>(null);
  return (
    <div className="flex flex-wrap items-start gap-6">
      <section className="flex min-w-0 flex-[3_1_420px] flex-col gap-3.5">
        {offers.length === 0 && <p className="m-0 text-muted">Ainda não tem ofertas. Crie a primeira: um menu, uma caixa, uma encomenda.</p>}
        {offers.map((o) => (
          <article key={o.id} className={`box flex flex-wrap justify-between gap-4 p-5 ${o.active ? "" : "opacity-50"}`}>
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
              <span className="lab text-muted">
                {MODE_LABEL[o.fulfilment_mode]}
                {o.active ? "" : " · inativa"}
              </span>
              <span className="d text-2xl leading-[1.15]">{o.title}</span>
              {o.description && <span className="text-sm text-muted">{o.description}</span>}
              <span className="text-[13px] text-muted">
                {o.min_guests}–{o.max_guests ?? "∞"} · reservar com {o.lead_time_hours} h · {o.time_slots.join(", ")}
              </span>
            </div>
            <div className="flex flex-col items-end justify-between gap-3">
              <span className="num font-semibold">{offerPriceLabel({ priceModel: o.price_model, price: o.price, unit: o.unit_label })}</span>
              <button type="button" className="btn btn-sm btn-o" onClick={() => setEditing(o)}>
                Editar
              </button>
            </div>
          </article>
        ))}
        <button type="button" className="btn self-start" onClick={() => setEditing({ ...EMPTY })}>
          Nova oferta
        </button>
      </section>
      {editing && <OfferForm key={editing.id || "new"} offer={editing} onDone={() => setEditing(null)} />}
    </div>
  );
}

function OfferForm({ offer, onDone }: { offer: DashOffer; onDone: () => void }) {
  const router = useRouter();
  const [o, setO] = useState(offer);
  const [slots, setSlots] = useState(offer.time_slots.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof DashOffer>(k: K, v: DashOffer[K]) => setO((p) => ({ ...p, [k]: v }));

  function save() {
    setError(null);
    start(async () => {
      const r = await saveOffer({
        ...o,
        id: o.id || undefined,
        description: o.description ?? undefined,
        time_slots: slots.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (!r.ok) return setError(r.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <form
      className="box flex min-w-0 flex-[2_1_340px] flex-col gap-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <span className="d text-2xl">{o.id ? "Editar oferta" : "Nova oferta"}</span>
      <label className="field lab">
        Título
        <input required value={o.title} onChange={(e) => set("title", e.target.value)} placeholder="Jantar do Minho" />
      </label>
      <label className="field lab">
        Descrição
        <textarea rows={2} value={o.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Pratos, tempos, o que inclui" />
      </label>
      <div className="grid grid-cols-2 gap-3.5">
        <label className="field lab">
          Onde
          <select value={o.fulfilment_mode} onChange={(e) => set("fulfilment_mode", e.target.value as DashOffer["fulfilment_mode"])}>
            <option value="home">Em casa do cliente</option>
            <option value="delivery">Entrega</option>
            <option value="pickup">Levantamento</option>
          </select>
        </label>
        <label className="field lab">
          Preço
          <select value={o.price_model} onChange={(e) => set("price_model", e.target.value as DashOffer["price_model"])}>
            <option value="per_person">Por pessoa / unidade</option>
            <option value="fixed">Fixo</option>
            <option value="quote">Sob orçamento</option>
          </select>
        </label>
        {o.price_model !== "quote" && (
          <label className="field lab">
            Valor (€)
            <input
              inputMode="decimal"
              value={o.price ?? ""}
              onChange={(e) => set("price", e.target.value ? Number(e.target.value.replace(",", ".")) : null)}
            />
          </label>
        )}
        <label className="field lab">
          Unidade
          <input value={o.unit_label} onChange={(e) => set("unit_label", e.target.value)} placeholder="pessoa, refeição, bolo" />
        </label>
        <label className="field lab">
          Mínimo
          <input inputMode="numeric" value={o.min_guests} onChange={(e) => set("min_guests", Number(e.target.value) || 1)} />
        </label>
        <label className="field lab">
          Máximo
          <input inputMode="numeric" value={o.max_guests ?? ""} onChange={(e) => set("max_guests", e.target.value ? Number(e.target.value) : null)} />
        </label>
        <label className="field lab">
          Antecedência (horas)
          <input inputMode="numeric" value={o.lead_time_hours} onChange={(e) => set("lead_time_hours", Number(e.target.value) || 0)} />
        </label>
        <label className="field lab">
          Horas (separadas por vírgula)
          <input value={slots} onChange={(e) => setSlots(e.target.value)} placeholder="13:00, 20:00" />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={o.active} onChange={(e) => set("active", e.target.checked)} className="accent-ink" />
        Visível no perfil e no mapa
      </label>
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
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
            onClick={() => {
              if (!confirm("Apagar esta oferta?")) return;
              start(async () => {
                await deleteOffer(o.id);
                router.refresh();
                onDone();
              });
            }}
          >
            Apagar
          </button>
        )}
      </div>
    </form>
  );
}
