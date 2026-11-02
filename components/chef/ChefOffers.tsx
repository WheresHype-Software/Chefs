import { ChefSection } from "@/components/chef/ChefSection";
import { MODE_LABEL, offerPriceLabel } from "@/lib/format";
import type { Offer } from "@/lib/types";

/** "Para 2–8 pessoas", "Reservar com 48 h de antecedência", "13:00 · 20:00": what to know before picking. */
function offerDetails(o: Offer): string[] {
  const unit = o.unit === "pessoa" ? "pessoas" : o.unit;
  const size =
    o.maxGuests && o.maxGuests !== o.minGuests
      ? `${o.minGuests}–${o.maxGuests} ${unit}`
      : o.minGuests > 1
        ? `A partir de ${o.minGuests} ${unit}`
        : null;
  return [
    size,
    o.leadHours >= 24
      ? `Reservar com ${Math.round(o.leadHours / 24)} ${Math.round(o.leadHours / 24) === 1 ? "dia" : "dias"} de antecedência`
      : o.leadHours > 0
        ? `Reservar com ${o.leadHours} h de antecedência`
        : null,
    o.timeSlots.length ? o.timeSlots.join(" · ") : null,
  ].filter((d): d is string => Boolean(d));
}

/** The chef's menus with what each includes; each opens the booking form with that menu picked. */
export function ChefOffers({ offers }: { offers: Offer[] }) {
  return (
    <ChefSection
      id="menus"
      icon="menu"
      title="Menus e preços"
      subtitle={offers.length ? "Escolha um menu para pedir reserva com ele." : undefined}
    >
      {offers.length === 0 ? (
        <p className="m-0 text-muted">Ainda sem menus publicados.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {offers.map((o) => (
            <li key={o.id}>
              <a
                href={`?oferta=${o.id}#reservar`}
                className="group flex flex-wrap justify-between gap-x-5 gap-y-3 rounded-[10px] border border-line p-4 text-ink no-underline transition-colors hover:border-cobalt md:p-5"
              >
                <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1.5">
                  <span className="lab text-muted">{MODE_LABEL[o.mode]}</span>
                  <strong className="text-[20px] font-bold leading-tight">{o.title}</strong>
                  {o.description && <span className="text-[15px] text-ink-3">{o.description}</span>}
                  <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                    {offerDetails(o).map((d) => (
                      <li key={d} className="rounded-full bg-paper px-2.5 py-1 text-[13px] text-ink-3">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start justify-between gap-2 sm:items-end">
                  <span className="text-lg font-bold tabular-nums">{offerPriceLabel(o)}</span>
                  <span className="text-sm font-semibold text-cobalt group-hover:underline">Pedir este menu →</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </ChefSection>
  );
}
