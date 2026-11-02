import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { fromPrice, titledName } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
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

/** The chef picked on the map: who, where, from how much, and rough travel times to their zone. */
export function MapChefCard({ chef, origin, originIsMe, onClose, raised = false }: Props) {
  const trip = origin ? travelEstimates(origin, chef) : null;

  return (
    <div
      className={`al-in absolute inset-x-3 z-[5] md:bottom-auto md:top-3 flex flex-col gap-3 rounded-[10px] border border-line bg-white p-3 shadow-[0_18px_40px_-18px_rgb(20_32_51/0.45)] md:left-3 md:right-auto md:w-[360px] ${raised ? "bottom-[76px]" : "bottom-3"}`}
    >
      <div className="flex gap-3">
        <Link href={`/chef/${chef.slug}`} className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[8px] bg-paper" tabIndex={-1}>
          <Photo photo={chef.cover} alt="" sizes="72px" className="h-full w-full" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link href={`/chef/${chef.slug}`} className="truncate text-[17px] font-bold text-ink no-underline hover:text-cobalt">
            {titledName(chef)}
          </Link>
          <span className="truncate text-[14px] text-muted">
            {chef.area} · desloca-se até {chef.radiusKm} km
          </span>
          <span className="text-[14px]">
            desde <strong className="num">{fromPrice(chef.offers)}</strong>
          </span>
        </div>
        <button type="button" onClick={onClose} className="ctl !h-8 !w-8 shrink-0 !text-base" aria-label="Fechar">
          ×
        </button>
      </div>

      {trip && (
        <div className="flex flex-col gap-1.5 border-t border-line pt-2.5">
          <span className="text-[12px] text-muted">
            Cerca de {String(trip.km).replace(".", ",")} km {originIsMe ? "de si" : "da zona pesquisada"} · estimativa até à zona do chef
          </span>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {trip.times.map((t) => (
              <li key={t.mode} className="flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[13px] font-semibold">
                {ICON[t.mode]}
                <span className="sr-only">{t.label}:</span>
                {durationLabel(t.minutes)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href={`/chef/${chef.slug}`} className="btn btn-sm">
        Ver perfil e pedir reserva
      </Link>
    </div>
  );
}
