import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Stars } from "@/components/chef/ReviewList";
import { decimal } from "@/lib/format";
import { LOCALE_TAG, type Locale } from "@/lib/i18n/routing";
import type { BookingReviewData } from "@/lib/types";

const CATEGORIES = ["food", "presentation", "punctuality", "communication", "value"] as const;

type Props = {
  review: BookingReviewData;
  title: string;
  /** The chef's reply form, when the chef views a review they haven't answered yet. */
  replySlot?: ReactNode;
};

/** A booking's review, shown on the booking itself: stars, the comment, per-category scores and the chef's reply. */
export function BookingReview({ review: r, title, replySlot }: Props) {
  const t = useTranslations("booking.review");
  const tc = useTranslations("chef.reviews.categories");
  const tr = useTranslations("chef.reviews");
  const locale = useLocale() as Locale;
  return (
    <section aria-label={title} className="box flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-[22px] font-bold">{title}</h2>
        <span className="text-[13px] text-muted">
          {new Date(r.created_at).toLocaleDateString(LOCALE_TAG[locale], { day: "numeric", month: "long" })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[34px] font-extrabold leading-none tabular-nums">{decimal(Number(r.overall), 1, locale)}</span>
        <Stars value={Number(r.overall)} />
      </div>
      {r.comment && <p className="m-0 whitespace-pre-line text-[16px] [overflow-wrap:anywhere]">{t("quoted", { comment: r.comment })}</p>}
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-3">
        {CATEGORIES.map((key) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="text-muted">{tc(key)}</dt>
            <dd className="m-0 font-semibold tabular-nums">{String(r[key])}</dd>
          </div>
        ))}
      </dl>
      {r.chef_reply ? (
        <div className="rounded-[8px] bg-paper px-4 py-3 text-[15px]">
          <strong className="font-semibold">{tr("reply")}</strong> {r.chef_reply}
        </div>
      ) : (
        replySlot
      )}
    </section>
  );
}
