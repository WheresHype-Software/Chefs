import { useLocale, useTranslations } from "next-intl";
import { ChefSection } from "@/components/chef/ChefSection";
import { modeLabel, offerPriceLabel, unitLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import type { Offer } from "@/lib/types";

type T = ReturnType<typeof useTranslations<"chef.offers">>;

/** "Para 2–8 pessoas", "Reservar com 48 h de antecedência", "13:00 · 20:00": what to know before picking. */
function offerDetails(o: Offer, t: T, locale: Locale): string[] {
  const unit = unitLabel(o.unit === "pessoa" ? "pessoas" : o.unit, locale);
  const size =
    o.maxGuests && o.maxGuests !== o.minGuests
      ? t("range", { min: o.minGuests, max: o.maxGuests, unit })
      : o.minGuests > 1
        ? t("minimum", { min: o.minGuests, unit })
        : null;
  return [
    size,
    o.leadHours >= 24
      ? t("leadDays", { days: Math.round(o.leadHours / 24) })
      : o.leadHours > 0
        ? t("leadHours", { hours: o.leadHours })
        : null,
    o.timeSlots.length ? o.timeSlots.join(" · ") : null,
  ].filter((d): d is string => Boolean(d));
}

/** The chef's menus with what each includes; each opens the booking form with that menu picked. */
export function ChefOffers({ offers }: { offers: Offer[] }) {
  const t = useTranslations("chef.offers");
  const locale = useLocale() as Locale;
  return (
    <ChefSection id="menus" icon="menu" title={t("title")} subtitle={offers.length ? t("subtitle") : undefined}>
      {offers.length === 0 ? (
        <p className="m-0 text-muted">{t("none")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {offers.map((o) => (
            <li key={o.id}>
              <a
                href={`?oferta=${o.id}#reservar`}
                className="group flex flex-wrap justify-between gap-x-5 gap-y-3 rounded-[10px] border border-line p-4 text-ink no-underline transition-colors hover:border-cobalt md:p-5"
              >
                <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1.5">
                  <span className="lab text-muted">{modeLabel(o.mode, locale)}</span>
                  <strong className="text-[20px] font-bold leading-tight">{o.title}</strong>
                  {o.description && <span className="text-[15px] text-ink-3">{o.description}</span>}
                  <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                    {offerDetails(o, t, locale).map((d) => (
                      <li key={d} className="rounded-full bg-paper px-2.5 py-1 text-[13px] text-ink-3">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start justify-between gap-2 sm:items-end">
                  <span className="text-lg font-bold tabular-nums">{offerPriceLabel(o, locale)}</span>
                  <span className="text-sm font-semibold text-cobalt group-hover:underline">{t("cta")}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </ChefSection>
  );
}
