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
import type { MonthCalendarData } from "@/hooks/useMonthCalendar";
import { dayLabel, euro, titledFirst, titledName, unitTitle } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

/** Where to send the person when something is missing, in the order of the form. */
const FIELD_ORDER = ["day", "time", "address", "name", "email", "phone"] as const;

type Props = {
  chef: ChefCard;
  initialOfferId?: string;
  initialAddress?: Place | null;
  /** The current month's days, already loaded by the page. */
  initialCalendar?: MonthCalendarData;
  onClose?: () => void;
  /** Bleed the sticky footer to the panel edges (map panel) or keep it inside (profile page). */
  bleed?: boolean;
};

export function BookingForm({ chef, initialOfferId, initialAddress, initialCalendar, onClose, bleed = false }: Props) {
  const form = useBookingForm(chef, { initialOfferId, initialAddress, initialCalendar });
  const { offer, calendar, contact } = form;
  const chefFirst = titledFirst(chef);

  if (form.sent) {
    return (
      <BookingSent
        booking={form.sent}
        chefFirstName={chefFirst}
        chefName={titledName(chef)}
        date={form.day!}
        email={contact.email}
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
      className="booking-form flex flex-col gap-7"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.submit()) {
          // Take the person to the first thing that's missing.
          const first = FIELD_ORDER.find((k) => form.missing[k]);
          const el = first && document.getElementById(`bf-${first}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true });
        }
      }}
    >
      <OfferPicker offers={chef.offers} selected={form.offerIndex} onSelect={form.chooseOffer} />

      <div id="bf-day" className={form.invalid("day") ? "rounded-[10px] p-2 -m-2 ring-2 ring-danger/50" : undefined}>
        <MonthCalendar
          year={calendar.year}
          month={calendar.month}
          calendar={calendar.calendar}
          canGoBack={calendar.canGoBack}
          onShift={calendar.shift}
          failed={calendar.failed}
          onRetry={calendar.retry}
          selected={form.day}
          onSelect={form.setDay}
          noneSoon={calendar.noneSoon}
        />
        {form.invalid("day") && (
          <p role="alert" className="m-0 mt-2 text-sm text-danger">
            Escolha um dia livre.
          </p>
        )}
      </div>

      <div id="bf-time" className={form.invalid("time") ? "rounded-[10px] p-2 -m-2 ring-2 ring-danger/50" : undefined}>
        <TimeSlots slots={offer.timeSlots} selected={form.time} onSelect={form.setTime} />
        {form.invalid("time") && (
          <p role="alert" className="m-0 mt-2 text-sm text-danger">
            Escolha a hora.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-line pb-5">
        <h3 className="step-title m-0 text-[15px] font-semibold">{unitTitle(offer)}</h3>
        <Stepper value={form.guests} min={offer.minGuests} max={form.maxGuests} onChange={form.setGuests} />
      </div>

      {form.needsAddress && (
        <div id="bf-address" className="field lab">
          <h3 className="step-title required m-0 text-[15px] font-semibold text-ink">Morada</h3>
          <AddressSearch
            label="Morada"
            value={form.address}
            onChange={form.setAddress}
            onSelect={form.setPlace}
            placeholder="Rua, número, andar, código postal"
            inputClassName="w-full"
            allowCustom
            invalid={form.invalid("address")}
          />
          {form.invalid("address") && (
            <span role="alert" className="text-sm font-normal text-danger">
              Indique a morada do serviço.
            </span>
          )}
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
            Na cozinha de {titledName(chef)}, em {chef.area}. A morada exata é enviada quando o pedido for aceite.
          </span>
        </div>
      )}

      <div className="-mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="step-title m-0 text-[15px] font-semibold">Os seus dados</h3>
        <span className="text-[13px] text-muted">
          <span className="text-danger">*</span> obrigatório
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3.5">
        <Field label="Nome" className="col-span-full" required>
          <input
            id="bf-name"
            aria-invalid={form.invalid("name") || undefined}
            type="text"
            autoComplete="name"
            required
            value={contact.name}
            onChange={(e) => form.updateContact("name", e.target.value)}
            placeholder="O seu nome"
          />
        </Field>
        <Field
          label="Email"
          required
          hint={form.invalid("email") ? <span className="text-danger">Indique um email válido.</span> : undefined}
        >
          <input
            id="bf-email"
            aria-invalid={form.invalid("email") || undefined}
            type="email"
            autoComplete="email"
            required
            value={contact.email}
            onChange={(e) => form.updateContact("email", e.target.value)}
            placeholder="nome@email.pt"
          />
        </Field>
        <Field label="Telemóvel" required>
          <input
            id="bf-phone"
            aria-invalid={form.invalid("phone") || undefined}
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

      {/* Pinned while choosing; unpinned while typing (globals.css) so it never covers a field. */}
      <div
        className={`booking-summary sticky bottom-0 z-10 flex flex-col gap-2.5 border-t border-line bg-white pb-[max(14px,env(safe-area-inset-bottom))] pt-3 ${bleed ? "-mx-7 px-7" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-[8rem] flex-1 flex-col">
            <span className="d num text-[22px] leading-tight">{form.estimate == null ? "Sob orçamento" : euro(form.estimate)}</span>
            <span className="truncate text-[13px] text-muted">
              {form.day
                ? [dayLabel(form.day), form.time, `${form.guests} ${unitTitle(offer).toLowerCase()}`].filter(Boolean).join(" · ")
                : form.estimate == null
                  ? offer.title
                  : `${euro(offer.price)} × ${form.guests}`}
            </span>
          </div>
          <button type="submit" className="btn grow sm:grow-0" disabled={form.pending}>
            {form.pending ? "A enviar…" : form.ctaLabel}
          </button>
        </div>
        <FormMessage message={form.error ? { ok: false, text: form.error } : null} />
      </div>
      <span className="-mt-4 text-center text-xs text-muted">Ainda não paga nada · paga diretamente ao chef</span>
    </form>
  );
}
