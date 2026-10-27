import { fromPrice, rating, tierLabel, toneFor } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

/** Compact chef card used in the map rail and the dashboard preview. */
export function ChefMiniCard({ chef, selected, onSelect }: { chef: ChefCard; selected?: boolean; onSelect?: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex flex-[0_0_260px] cursor-pointer gap-3.5 rounded-[3px] border border-line bg-white p-2.5 text-left text-ink transition hover:-translate-y-[3px] hover:border-ink aria-pressed:border-ink md:flex-[0_0_300px]"
    >
      <span className="flex h-[150px] flex-[0_0_88px] items-end overflow-hidden rounded-[2px] p-2" style={{ background: toneFor(chef.id) }}>
        {chef.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chef.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] uppercase tracking-[.12em] text-muted">Foto</span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-[3px] py-1 pr-1">
        <span className="lab text-muted">{tierLabel(chef.tier, chef.isNew, chef.reviewCount, chef.rating)}</span>
        <span className="d text-[22px] leading-[1.1]">{chef.name}</span>
        <span className="text-[13px] text-muted">
          {chef.categories.join(" · ")} · {chef.area}
        </span>
        <span className="num mt-auto text-[13px]">
          <strong className="font-semibold">{rating(chef.rating, chef.reviewCount)}</strong> · desde {fromPrice(chef.offers)}
        </span>
      </span>
    </button>
  );
}

type Props = { chefs: ChefCard[]; selectedId: string | null; onSelect: (id: string) => void; panelOpen: boolean };

/** Horizontal rail of chef cards along the bottom of the map. */
export function ChefRail({ chefs, selectedId, onSelect, panelOpen }: Props) {
  return (
    <div
      className={`absolute bottom-2.5 left-2.5 right-2.5 z-[4] flex gap-2.5 overflow-x-auto pb-1 transition-[right] duration-[600ms] [scrollbar-width:none] md:bottom-4 md:left-4 ${
        panelOpen ? "md:right-[472px]" : "md:right-4"
      }`}
    >
      {chefs.length === 0 && (
        <div className="box flex-[0_0_300px] p-4 text-sm text-muted">
          Ainda não há chefs para esta pesquisa. Experimente outro tipo de serviço ou outra morada.
        </div>
      )}
      {chefs.map((c) => (
        <ChefMiniCard key={c.id} chef={c} selected={c.id === selectedId} onSelect={() => onSelect(c.id)} />
      ))}
    </div>
  );
}
