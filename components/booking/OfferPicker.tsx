import { MODE_LABEL, offerPriceLabel } from "@/lib/format";
import type { Offer } from "@/lib/types";

type Props = { offers: Offer[]; selected: number; onSelect: (index: number) => void };

/** Radio-style list of a chef's offers with mode and price. */
export function OfferPicker({ offers, selected, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="Menu">
      <h3 className="lab m-0 mb-1 border-b border-ink pb-2.5">Menu</h3>
      {offers.map((o, i) => (
        <button key={o.id} type="button" role="radio" className="opt" aria-checked={i === selected} onClick={() => onSelect(i)}>
          <span className="flex gap-3">
            <span className="dot" />
            <span className="flex flex-col">
              <span className="d text-[19px] leading-[1.2]">{o.title}</span>
              <span className="text-[13px] text-muted">
                {MODE_LABEL[o.mode]}
                {o.description ? ` · ${o.description}` : ""}
              </span>
            </span>
          </span>
          <span className="num whitespace-nowrap text-sm font-semibold">{offerPriceLabel(o)}</span>
        </button>
      ))}
    </div>
  );
}
