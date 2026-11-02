"use client";

import { useState } from "react";
import type { Review } from "@/lib/types";

type Sort = "recent" | "best" | "worst";
const SORTS: [Sort, string][] = [
  ["recent", "Mais recentes"],
  ["best", "Melhor avaliadas"],
  ["worst", "Pior avaliadas"],
];
const PAGE = 6;

const sorted = (reviews: Review[], sort: Sort) =>
  sort === "recent" ? reviews : [...reviews].sort((a, b) => (sort === "best" ? b.overall - a.overall : a.overall - b.overall));

export function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-[15px] tracking-[1px] text-cobalt" aria-label={`${full} de 5 estrelas`}>
      {"★".repeat(full)}
      <span className="text-line-3">{"★".repeat(5 - full)}</span>
    </span>
  );
}

function ReviewCard({ review: r }: { review: Review }) {
  return (
    <article className="flex flex-col gap-2.5 rounded-[10px] border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <strong className="font-semibold">{r.author}</strong>
        <span className="text-[13px] text-muted">{new Date(r.date).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Stars value={r.overall} />
        {/* Every review comes from a completed booking; the menu shows when the booking is readable. */}
        <span className="text-[13px] text-muted">Reserva verificada{r.what ? ` · ${r.what}` : ""}</span>
      </div>
      {r.comment && <p className="m-0 whitespace-pre-line [overflow-wrap:anywhere]">{r.comment}</p>}
      {r.reply && (
        <div className="rounded-[8px] bg-paper px-3.5 py-3 text-sm">
          <strong className="font-semibold">Resposta do chef:</strong> {r.reply}
        </div>
      )}
    </article>
  );
}

/** The reviews themselves: sortable (including the worst first, for honesty) and a few at a time. */
export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(PAGE);
  const list = sorted(reviews, sort);

  return (
    <div className="flex flex-col gap-4">
      {reviews.length > 2 && (
        <div role="group" aria-label="Ordenar avaliações" className="flex flex-wrap gap-1.5">
          {SORTS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={sort === key}
              onClick={() => {
                setSort(key);
                setShown(PAGE);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4">
        {list.slice(0, shown).map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
      {shown < list.length && (
        <button type="button" className="btn btn-o btn-sm self-start" onClick={() => setShown((n) => n + PAGE)}>
          Ver mais avaliações ({list.length - shown})
        </button>
      )}
    </div>
  );
}
