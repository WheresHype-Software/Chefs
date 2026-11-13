import { useLocale, useTranslations } from "next-intl";
import { ICONS, type IconName } from "@/components/chef/icons";
import { minPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import { languageNames } from "@/lib/languages";
import type { ChefProfile } from "@/lib/types";

/** The short answers people look for first, under the name: price, where, languages, how fast. Cuisines and services, which can be long, have their own section. */
export function ChefKeyFacts({ chef }: { chef: ChefProfile }) {
  const t = useTranslations("chef.facts");
  const locale = useLocale() as Locale;
  const price = minPrice(chef.offers, locale);
  const priceValue = chef.offers.length ? (price ? t("from", { price }) : t("quote")) : t("menusSoon");
  const facts: [IconName, string, string][] = [
    ["euro", t("price"), priceValue],
    ["pin", t("area"), t("areaValue", { area: chef.area ?? "", km: chef.radiusKm })],
  ];
  if (chef.languages.length) facts.push(["person", t("languages"), languageNames(chef.languages, locale).join(", ")]);
  if (chef.responseHours) facts.push(["clock", t("responds"), t("respondsValue", { hours: chef.responseHours })]);

  return (
    <dl className="m-0 grid grid-cols-1 gap-4 rounded-[14px] border border-line bg-white p-4 shadow-[0_10px_30px_-20px_rgb(20_32_51/0.35)] min-[420px]:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] md:p-5">
      {facts.map(([icon, label, value]) => (
        <div key={label} className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-cobalt [&_svg]:h-[18px] [&_svg]:w-[18px]"
          >
            {ICONS[icon]}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="m-0 text-[16px] font-bold leading-snug text-ink [overflow-wrap:anywhere]">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
