"use client";

import { useTranslations, useLocale } from "next-intl";
import { LumiSlot } from "@/components/dashboard/LumiCoach";
import { Link } from "@/lib/i18n/navigation";
import { useState } from "react";
import { OfferForm } from "@/components/dashboard/OfferForm";
import type { DashOffer } from "@/lib/dashboard";
import { modeLabel, offerPriceLabel } from "@/lib/format";
import { type Locale } from "@/lib/i18n/routing";

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
  const t = useTranslations("dashboard.offers");
  const locale = useLocale() as Locale;
  return (
    <article className={`box flex flex-wrap justify-between gap-4 p-5 ${offer.active ? "" : "opacity-50"}`}>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
        <span className="lab text-muted">
          {modeLabel(offer.fulfilment_mode, locale)}
          {offer.active ? "" : ` · ${t("inactive")}`}
        </span>
        <h2 className="d m-0 text-2xl font-normal leading-[1.15]">{offer.title}</h2>
        {offer.description && <span className="text-sm text-muted">{offer.description}</span>}
        <span className="text-[13px] text-muted">
          {t("meta", {
            min: offer.min_guests,
            max: offer.max_guests ?? "∞",
            hours: offer.lead_time_hours,
            slots: offer.time_slots.join(", "),
          })}
        </span>
      </div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
        <span className="num font-semibold">
          {offerPriceLabel({ priceModel: offer.price_model, price: offer.price, unit: offer.unit_label }, locale)}
        </span>
        <button type="button" className="btn btn-sm btn-o" onClick={onEdit}>
          {t("edit")}
        </button>
      </div>
    </article>
  );
}

/** After a new offer: clients can only book on open days, so point to the agenda. */
function NextStepAgenda({ openDays, onClose }: { openDays: number; onClose: () => void }) {
  const t = useTranslations("dashboard.offers");
  return (
    <div role="status" className="flex flex-col gap-3 rounded-[10px] border border-cobalt/30 bg-cobalt-soft p-5">
      <span className="d text-xl">{t("created")}</span>
      <span className="text-[15px] text-ink-3">{openDays > 0 ? t("openDaysNote", { count: openDays }) : t("noOpenDaysNote")}</span>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/agenda" className="btn btn-sm">
          {openDays > 0 ? t("seeAvailability") : t("openDays")}
        </Link>
        <button type="button" className="btn btn-sm btn-o" onClick={onClose}>
          {t("close")}
        </button>
      </div>
    </div>
  );
}

/** The chef's offers with an inline editor for creating and changing them. */
export function OfferList({ offers, openDays }: { offers: DashOffer[]; openDays: number }) {
  const t = useTranslations("dashboard.offers");
  const [editing, setEditing] = useState<DashOffer | null>(null);
  const [created, setCreated] = useState(false);
  return (
    <div className="flex flex-wrap items-start gap-6">
      <section data-lumi="ofertas" className="flex min-w-0 flex-[3_1_420px] flex-col gap-3.5">
        <LumiSlot name="ofertas" />
        {created && <NextStepAgenda openDays={openDays} onClose={() => setCreated(false)} />}
        {offers.length === 0 && <p className="m-0 text-muted">{t("empty")}</p>}
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
          {t("newOffer")}
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
