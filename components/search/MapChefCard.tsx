import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { fromPrice, initials, titledName } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import type { Locale } from "@/lib/i18n/routing";
import { durationLabel, travelEstimates, type TravelMode } from "@/lib/travel";
import type { ChefCard } from "@/lib/types";

const svg = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, "aria-hidden": true };

const ICON: Record<TravelMode, React.ReactNode> = {
  walk: (
    <svg {...svg}>
      <circle cx="13" cy="4" r="2" />
      <path d="m9 21 2-6 3 3v3M7 12l3-4 4 1 2 4M11 15l1-6" />
    </svg>
  ),
  bike: (
    <svg {...svg}>
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="M6 17l4-8h5l3 8M10 9 8 6H6M12 17l3-8" />
    </svg>
  ),
  car: (
    <svg {...svg}>
      <path d="M4 16v-4l2-5h12l2 5v4zM4 16v2h3v-2M17 16v2h3v-2M4 12h16" />
    </svg>
  ),
};

type Props = {
  chef: ChefCard;
  origin: LatLng | null;
  originIsMe: boolean;
  onClose: () => void;
  /** Sit above the phone's "Ver lista" switch. */
  raised?: boolean;
};

/** Up to three dishes across the top: the chef's food, not just the cover. */
function DishStrip({ chef }: { chef: ChefCard }) {
  const dishes = (chef.dishes.length ? chef.dishes : [chef.cover]).slice(0, 3);
  return (
    <div
      className="grid h-28 grid-rows-1 gap-0.5 overflow-hidden bg-paper"
      style={{ gridTemplateColumns: `repeat(${dishes.length}, minmax(0, 1fr))` }}
    >
      {dishes.map((url, i) => (
        <Photo key={`${url}-${i}`} photo={url} alt="" sizes="120px" className="h-full min-h-0 w-full" />
      ))}
    </div>
  );
}

/** The chef picked on the map: their face first, a few dishes, where, from how much, and rough travel times. */
export function MapChefCard({ chef, origin, originIsMe, onClose, raised = false }: Props) {
  const t = useTranslations("search.mapCard");
  const locale = useLocale() as Locale;
  const trip = origin ? travelEstimates(origin, chef) : null;

  return (
    <div
      className={`al-in absolute inset-x-3 z-[5] flex flex-col overflow-hidden rounded-[12px] border border-line bg-white shadow-[0_18px_40px_-18px_rgb(20_32_51/0.45)] md:bottom-auto md:left-3 md:right-auto md:top-3 md:w-[360px] ${raised ? "bottom-[76px]" : "bottom-3"}`}
    >
      <div className="relative">
        <Link href={`/chef/${chef.slug}`} tabIndex={-1} aria-hidden="true" className="block">
          <DishStrip chef={chef} />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="ctl absolute right-2 top-2 !h-8 !w-8 !bg-white/95 !text-base shadow"
          aria-label={t("close")}
        >
          ×
        </button>
        <Link
          href={`/chef/${chef.slug}`}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute -bottom-10 left-4 h-[84px] w-[84px] overflow-hidden rounded-full bg-cobalt-soft shadow-[0_6px_18px_-6px_rgb(20_32_51/0.45)] ring-4 ring-white"
        >
          {chef.portrait ? (
            <Photo photo={chef.portrait} alt="" sizes="84px" className="h-full w-full" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[26px] font-extrabold tracking-[-0.03em] text-cobalt">
              {initials(chef.name)}
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-col gap-3 p-3 pt-1">
        <div className="flex min-w-0 flex-col gap-0.5 pl-[100px]">
          <Link href={`/chef/${chef.slug}`} className="truncate text-[17px] font-bold text-ink no-underline hover:text-cobalt">
            {titledName(chef, locale)}
          </Link>
          <span className="text-[14px]">
            {t.rich("from", { price: fromPrice(chef.offers, locale), strong: (c) => <strong className="tabular-nums">{c}</strong> })}
          </span>
        </div>
        <span className="truncate text-[14px] text-muted">{t("radius", { area: chef.area ?? "", km: chef.radiusKm })}</span>

        {trip && (
          <div className="flex flex-col gap-1.5 border-t border-line pt-2.5">
            <span className="text-[12px] text-muted">
              {t(originIsMe ? "tripFromMe" : "tripFromPlace", {
                km: locale === "pt" ? String(trip.km).replace(".", ",") : String(trip.km),
              })}
            </span>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {trip.times.map((e) => (
                <li key={e.mode} className="flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[13px] font-semibold">
                  {ICON[e.mode]}
                  <span className="sr-only">{t(`travel.${e.mode}`)}:</span>
                  {durationLabel(e.minutes, locale)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href={`/chef/${chef.slug}`} className="btn btn-sm">
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
