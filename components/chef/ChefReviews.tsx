import { useLocale, useTranslations } from "next-intl";
import { ChefSection } from "@/components/chef/ChefSection";
import { ReviewList, Stars } from "@/components/chef/ReviewList";
import { decimal } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import type { ChefProfile } from "@/lib/types";

/** Average and count, how the stars spread (5★ to 1★), and the per-category scores. */
function Summary({ chef }: { chef: ChefProfile }) {
  const t = useTranslations("chef.reviews");
  const locale = useLocale() as Locale;
  const total = chef.ratingDistribution.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="grid gap-6 rounded-[10px] border border-line p-5 md:grid-cols-[auto_1fr_1fr] md:items-center md:gap-8">
      <div className="flex flex-col">
        <span className="text-[48px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
          {decimal(Number(chef.rating), 1, locale)}
        </span>
        <Stars value={Number(chef.rating)} />
        <span className="text-[14px] text-muted">{t("count", { count: chef.reviewCount })}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={t("distribution")}>
        {chef.ratingDistribution.map((count, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[13px]">
            <span className="w-7 shrink-0 text-muted">{5 - i} ★</span>
            <span className="h-1.5 flex-auto overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-cobalt" style={{ width: `${(count / total) * 100}%` }} />
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums text-muted">{count}</span>
          </li>
        ))}
      </ul>
      {chef.categoryAverages.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={t("byCategory")}>
          {chef.categoryAverages.map((k) => (
            <li key={k.label} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="text-ink-3">{k.label}</span>
              <span className="font-semibold tabular-nums">{decimal(k.value, 1, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Reviews: only clients with a completed booking can write one; the chef can reply publicly. */
export function ChefReviews({ chef }: { chef: ChefProfile }) {
  const t = useTranslations("chef.reviews");
  return (
    <ChefSection id="avaliacoes" icon="star" title={t("title")} subtitle={t("subtitle")}>
      {chef.reviews.length === 0 ? (
        <p className="m-0 text-muted">{t("none")}</p>
      ) : (
        <>
          <Summary chef={chef} />
          <ReviewList reviews={chef.reviews} />
        </>
      )}
    </ChefSection>
  );
}
