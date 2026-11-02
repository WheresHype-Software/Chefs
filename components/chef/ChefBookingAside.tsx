import { BookingForm } from "@/components/booking/BookingForm";
import type { MonthCalendarData } from "@/hooks/useMonthCalendar";
import { firstName } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

type Props = { chef: ChefProfile; initialCalendar?: MonthCalendarData; initialOfferId?: string };

/** "Pedir reserva": how a request works, then the booking form (or a note while there are no offers). */
export function ChefBookingAside({ chef, initialCalendar, initialOfferId }: Props) {
  const bookable = chef.offers.length > 0;
  return (
    <aside id="reservar" className="box box-border flex min-w-0 flex-[1_1_360px] scroll-mt-20 flex-col gap-4 p-5 md:p-[26px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line-2 pb-3">
        <h2 className="d m-0 text-[26px] md:text-[28px]">Pedir reserva</h2>
        <span className="text-[13px] text-muted">{chef.responseHours ? `responde em ~${chef.responseHours} h` : ""}</span>
      </div>
      {bookable && (
        <ol className="m-0 flex list-none flex-col gap-1.5 rounded-[8px] bg-paper p-3 text-[14px] text-ink-3">
          {[
            "Escolha o menu, o dia e a hora.",
            "Envie o pedido: não paga nada e não precisa de conta.",
            `${firstName(chef.name)} aceita ou propõe outra data em até 48 h.`,
          ].map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="num font-bold text-cobalt">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      )}
      {bookable ? (
        <BookingForm
          key={`${chef.id}:${initialOfferId ?? ""}`}
          chef={chef}
          initialCalendar={initialCalendar}
          initialOfferId={initialOfferId}
        />
      ) : (
        <p className="m-0 text-muted">
          {firstName(chef.name)} ainda está a preparar os menus. Volte em breve
          {chef.socials.instagram ? ", ou acompanhe no Instagram." : "."}
        </p>
      )}
      <a href="#condicoes" className="text-[13px] text-muted">
        Pagamento, sinal e cancelamento →
      </a>
    </aside>
  );
}
