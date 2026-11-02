"use client";

import Link from "next/link";
import { useState } from "react";
import { OfferForm } from "@/components/dashboard/OfferForm";
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

/** After a new offer: clients can only book on open days, so point to the agenda. */
function NextStepAgenda({ openDays, onClose }: { openDays: number; onClose: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-[10px] border border-cobalt/30 bg-cobalt-soft p-5">
      <span className="d text-xl">Oferta criada.</span>
      <span className="text-[15px] text-ink-3">
        {openDays > 0
          ? `Tem ${openDays} ${openDays === 1 ? "dia aberto" : "dias abertos"} em Disponibilidade: os clientes já podem pedir esta oferta nesses dias.`
          : "Agora abra, em Disponibilidade, os dias em que pode cozinhar. Os clientes só podem pedir reserva nos dias abertos."}
      </span>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/agenda" className="btn btn-sm">
          {openDays > 0 ? "Ver a disponibilidade" : "Abrir dias"}
        </Link>
        <button type="button" className="btn btn-sm btn-o" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

/** The chef's offers with an inline editor for creating and changing them. */
export function OfferList({ offers, openDays }: { offers: DashOffer[]; openDays: number }) {
  const [editing, setEditing] = useState<DashOffer | null>(null);
  const [created, setCreated] = useState(false);
  return (
    <div className="flex flex-wrap items-start gap-6">
      <section className="flex min-w-0 flex-[3_1_420px] flex-col gap-3.5">
        {created && <NextStepAgenda openDays={openDays} onClose={() => setCreated(false)} />}
        {offers.length === 0 && (
          <p className="m-0 text-muted">
            Ainda não tem ofertas. Crie a primeira: um menu, uma caixa, uma encomenda. Depois abra, em Disponibilidade, os dias em que pode
            cozinhar.
          </p>
        )}
        {offers.map((o) => (
          <OfferRow key={o.id} offer={o} onEdit={() => setEditing(o)} />
        ))}
        <button
          type="button"
          className="btn self-start"
          onClick={() => {
            setCreated(false);
            setEditing({ ...EMPTY_OFFER });
          }}
        >
          Nova oferta
        </button>
      </section>
      {editing && (
        <OfferForm
          key={editing.id || "new"}
          offer={editing}
          onDone={(saved) => {
            if (saved && !editing.id) setCreated(true);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
