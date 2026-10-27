"use client";

import { AddressSearch, type Place } from "@/components/AddressSearch";
import { BookingSent } from "@/components/booking/BookingSent";
import { MonthCalendar } from "@/components/booking/MonthCalendar";
import { OfferPicker } from "@/components/booking/OfferPicker";
import { TimeSlots } from "@/components/booking/TimeSlots";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { Stepper } from "@/components/ui/Stepper";
import { useBookingForm } from "@/hooks/useBookingForm";
import { dayLabel, euro, firstName, unitTitle } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

type Props = {
  chef: ChefCard;
  initialOfferId?: string;
  initialAddress?: Place | null;
  onClose?: () => void;
  /** Bleed the sticky footer to the panel edges (map panel) or keep it inside (profile page). */
  bleed?: boolean;
};

export function BookingForm({ chef, initialOfferId, initialAddress, onClose, bleed = false }: Props) {
  const form = useBookingForm(chef, { initialOfferId, initialAddress });
  const { offer, calendar, contact } = form;
  const chefFirst = firstName(chef.name);

  if (form.sent) {
    return (
      <BookingSent
        chefFirstName={chefFirst}
        email={contact.email}
        link={form.sent.link}
        onClose={onClose}
        summary={[
          ["Pedido", form.sent.ref],
          ["Menu", offer.title],
          ["Onde", offer.mode === "pickup" ? `Levantamento em ${chef.area}` : form.address],
          ["Quando", `${dayLabel(form.day!)} · ${form.time}`],
          [unitTitle(offer), String(form.guests)],
          ["Estimativa", form.estimate == null ? "Sob orçamento" : euro(form.estimate)],
        ]}
      />
    );
  }

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        form.submit();
      }}
    >
      <OfferPicker offers={chef.offers} selected={form.offerIndex} onSelect={form.chooseOffer} />

      <MonthCalendar
        year={calendar.year}
        month={calendar.month}
        calendar={calendar.calendar}
        canGoBack={calendar.canGoBack}
        onShift={calendar.shift}
        selected={form.day}
        onSelect={form.setDay}
      />

      <TimeSlots slots={offer.timeSlots} selected={form.time} onSelect={form.setTime} />

      <div className="flex items-center justify-between gap-3 border-b border-line pb-5">
        <h3 className="m-0 text-[15px] font-semibold">{unitTitle(offer)}</h3>
        <Stepper value={form.guests} min={offer.minGuests} max={form.maxGuests} onChange={form.setGuests} />
      </div>

      {form.needsAddress && (
        <div className="field lab">
          Morada
          <AddressSearch
            label="Morada"
            value={form.address}
            onChange={form.setAddress}
            onSelect={form.setPlace}
            placeholder="Rua, número, andar, código postal"
            inputClassName="w-full"
          />
          <span className="hint">
            {offer.mode === "home"
              ? `${chefFirst} desloca-se até ${chef.radiusKm} km de ${chef.area}.`
              : "A taxa de entrega é definida pelo chef."}
          </span>
        </div>
      )}
      {offer.mode === "pickup" && (
        <div className="flex flex-col gap-1 rounded-[2px] bg-paper px-4 py-3.5">
          <span className="lab">Levantamento</span>
          <span className="text-sm text-ink-3">
            Na cozinha de {chef.name}, em {chef.area}. A morada exata é enviada quando o pedido for aceite.
          </span>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3.5">
        <Field label="Nome" className="sm:col-span-2">
          <input
            type="text"
            autoComplete="name"
            required
            value={contact.name}
            onChange={(e) => form.updateContact("name", e.target.value)}
            placeholder="O seu nome"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            value={contact.email}
            onChange={(e) => form.updateContact("email", e.target.value)}
            placeholder="nome@email.pt"
          />
        </Field>
        <Field label="Telemóvel">
          <input
            type="tel"
            autoComplete="tel"
            required
            value={contact.phone}
            onChange={(e) => form.updateContact("phone", e.target.value)}
            placeholder="+351"
          />
        </Field>
      </div>
      <Field label="Notas para o chef">
        <textarea
          rows={3}
          maxLength={2000}
          value={contact.notes}
          onChange={(e) => form.updateContact("notes", e.target.value)}
          placeholder="Alergias, equipamento da cozinha, ocasião…"
        />
      </Field>

      <div className={`sticky bottom-0 flex flex-col gap-3 border-t border-line bg-white pb-[22px] pt-4 ${bleed ? "-mx-7 px-7" : ""}`}>
        <div className="num flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted">{form.estimate == null ? offer.title : `${euro(offer.price)} × ${form.guests}`}</span>
          <span className="d text-2xl">{form.estimate == null ? "Sob orçamento" : euro(form.estimate)}</span>
        </div>
        <FormMessage message={form.error ? { ok: false, text: form.error } : null} />
        <button type="submit" className="btn w-full" disabled={!form.ready || form.pending}>
          {form.pending ? "A enviar…" : form.ctaLabel}
        </button>
        <span className="text-center text-xs text-muted">Ainda não paga nada · paga diretamente ao chef</span>
      </div>
    </form>
  );
}
