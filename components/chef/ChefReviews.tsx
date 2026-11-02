import { ReviewList, Stars } from "@/components/chef/ReviewList";
import type { ChefProfile } from "@/lib/types";

const decimal = (n: number) => n.toFixed(1).replace(".", ",");

/** Average and count, how the stars spread (5★ to 1★), and the per-category scores. */
function Summary({ chef }: { chef: ChefProfile }) {
  const total = chef.ratingDistribution.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="grid gap-6 rounded-[10px] border border-line p-5 md:grid-cols-[auto_1fr_1fr] md:items-center md:gap-8">
      <div className="flex flex-col">
        <span className="text-[48px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{decimal(Number(chef.rating))}</span>
        <Stars value={Number(chef.rating)} />
        <span className="text-[14px] text-muted">
          {chef.reviewCount} {chef.reviewCount === 1 ? "avaliação" : "avaliações"}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Distribuição das avaliações">
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
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Por categoria">
          {chef.categoryAverages.map((k) => (
            <li key={k.label} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="text-ink-3">{k.label}</span>
              <span className="font-semibold tabular-nums">{decimal(k.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Reviews: only clients with a completed booking can write one; the chef can reply publicly. */
export function ChefReviews({ chef }: { chef: ChefProfile }) {
  return (
    <section id="avaliacoes" aria-labelledby="avaliacoes-title" className="flex scroll-mt-32 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="avaliacoes-title" className="d m-0 text-[32px]">
          Avaliações
        </h2>
        <p className="m-0 text-[15px] text-muted">Só clientes com uma reserva concluída podem avaliar.</p>
      </div>
      {chef.reviews.length === 0 ? (
        <p className="m-0 rounded-[10px] border border-line p-5 text-muted">
          Ainda sem avaliações. As primeiras chegam depois das primeiras reservas concluídas.
        </p>
      ) : (
        <>
          <Summary chef={chef} />
          <ReviewList reviews={chef.reviews} />
        </>
      )}
    </section>
  );
}
