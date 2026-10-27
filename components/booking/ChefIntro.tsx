import Link from "next/link";
import { rating, tierLabel, toneFor } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

/** Cover photo, name, categories and bio at the top of the map's booking panel. */
export function ChefIntro({ chef, onClose }: { chef: ChefCard; onClose?: () => void }) {
  return (
    <>
      <div className="relative flex h-[200px] items-end p-[18px]" style={{ background: chef.cover ? undefined : toneFor(chef.id) }}>
        {chef.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chef.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="lab text-muted">Fotografia · {chef.offers[0]?.title}</span>
        )}
        {onClose && (
          <button type="button" className="ctl absolute right-3.5 top-3.5 !border-white" onClick={onClose} aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111110" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2.5 px-7 pt-[26px]">
        <span className="lab text-muted">
          {tierLabel(chef.tier, chef.isNew, chef.reviewCount, chef.rating)} · {chef.area}
        </span>
        <h2 className="d m-0 text-[40px] leading-none">{chef.name}</h2>
        <div className="flex flex-wrap gap-1.5">
          {chef.categories.map((k) => (
            <span key={k} className="lab rounded-[2px] border border-ink px-[9px] py-[5px]">
              {k}
            </span>
          ))}
        </div>
        <span className="num text-sm text-muted">
          {rating(chef.rating, chef.reviewCount)}
          {chef.responseHours ? ` · responde em cerca de ${chef.responseHours} h` : ""}
        </span>
        {chef.bio && <p className="mb-0 mt-1 text-[15px] text-ink-2">{chef.bio}</p>}
        <Link href={`/chef/${chef.slug}`} className="self-start text-[13px] tracking-[.04em]">
          Ver perfil completo →
        </Link>
      </div>
    </>
  );
}
