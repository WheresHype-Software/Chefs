import { useLocale, useTranslations } from "next-intl";
import { modeLabel, offerPriceLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import type { Offer } from "@/lib/types";

type Props = { offers: Offer[]; selected: number; onSelect: (index: number) => void };

/** Radio-style list of a chef's offers with mode and price. */
export function OfferPicker({ offers, selected, onSelect }: Props) {
  const t = useTranslations("booking.form");
  const locale = useLocale() as Locale;
  return (
    <div role="radiogroup" aria-label={t("menuLabel")}>
      <h3 className="step-title m-0 mb-1 border-b border-line pb-2.5 text-[15px] font-semibold">{t("chooseMenu")}</h3>
      {offers.map((o, i) => (
        <button key={o.id} type="button" role="radio" className="opt" aria-checked={i === selected} onClick={() => onSelect(i)}>
          <span className="flex gap-3">
            <span className="dot" />
            <span className="flex flex-col">
              <span className="d text-[19px] leading-[1.2]">{o.title}</span>
              <span className="text-[13px] text-muted">
                {modeLabel(o.mode, locale)}
                {o.description ? ` · ${o.description}` : ""}
              </span>
            </span>
          </span>
          <span className="num whitespace-nowrap text-sm font-semibold">{offerPriceLabel(o, locale)}</span>
        </button>
      ))}
    </div>
  );
}
