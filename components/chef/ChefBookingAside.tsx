import { BookingForm } from "@/components/booking/BookingForm";
import { ICONS } from "@/components/chef/icons";
import type { MonthCalendarData } from "@/hooks/useMonthCalendar";
import { titledFirst } from "@/lib/format";
import { instagramHandle } from "@/lib/instagram";
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
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[14px] text-ink-3">
          {["Sem criar conta", "Não paga ao pedir", `Resposta em até 48 h`].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className="text-cobalt [&_svg]:h-4 [&_svg]:w-4">{ICONS.check}</span>
              {t}
            </li>
          ))}
        </ul>
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
          {titledFirst(chef)} ainda está a preparar os menus. Volte em breve
          {instagramHandle(chef.socials.instagram) ? ", ou acompanhe no Instagram." : "."}
        </p>
      )}
      <a href="#condicoes" className="text-[13px] text-muted">
        Pagamento, sinal e cancelamento →
      </a>
    </aside>
  );
}
