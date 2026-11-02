import type { ReactNode } from "react";
import { Stars } from "@/components/chef/ReviewList";
import type { BookingReviewData } from "@/lib/types";

const CATEGORIES: [keyof BookingReviewData, string][] = [
  ["food", "Comida"],
  ["presentation", "Apresentação"],
  ["punctuality", "Pontualidade"],
  ["communication", "Comunicação"],
  ["value", "Qualidade/preço"],
];

type Props = {
  review: BookingReviewData;
  title: string;
  /** The chef's reply form, when the chef views a review they haven't answered yet. */
  replySlot?: ReactNode;
};

/** A booking's review, shown on the booking itself: stars, the comment, per-category scores and the chef's reply. */
export function BookingReview({ review: r, title, replySlot }: Props) {
  return (
    <section aria-label={title} className="box flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-[22px] font-bold">{title}</h2>
        <span className="text-[13px] text-muted">
          {new Date(r.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[34px] font-extrabold leading-none tabular-nums">{Number(r.overall).toFixed(1).replace(".", ",")}</span>
        <Stars value={Number(r.overall)} />
      </div>
      {r.comment && <p className="m-0 whitespace-pre-line text-[16px] [overflow-wrap:anywhere]">«{r.comment}»</p>}
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-3">
        {CATEGORIES.map(([key, label]) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="m-0 font-semibold tabular-nums">{String(r[key])}</dd>
          </div>
        ))}
      </dl>
      {r.chef_reply ? (
        <div className="rounded-[8px] bg-paper px-4 py-3 text-[15px]">
          <strong className="font-semibold">Resposta do chef:</strong> {r.chef_reply}
        </div>
      ) : (
        replySlot
      )}
    </section>
  );
}
