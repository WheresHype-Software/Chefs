import { Link } from "@/lib/i18n/navigation";
import { ReviewReply } from "@/components/dashboard/ReviewReply";
import { Stars } from "@/components/chef/ReviewList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getReviews, requireChef } from "@/lib/dashboard";
import { rating } from "@/lib/format";

export default async function Avaliacoes() {
  const chef = await requireChef();
  const reviews = await getReviews();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        meta={rating(chef.rating_avg, chef.review_count)}
        title="O que dizem os seus clientes"
        description="Só clientes com reserva concluída avaliam. Pode responder uma vez a cada avaliação, e denunciar avaliações abusivas: a equipa decide."
      />
      {reviews.length === 0 && (
        <p className="m-0 text-muted">Ainda sem avaliações. O pedido de avaliação é enviado 24 horas depois de cada reserva concluída.</p>
      )}
      {reviews.map((r) => (
        // The client's words lead; who, stars and when sit quietly underneath.
        <article key={r.id} className="box flex flex-col gap-4 p-6">
          {r.comment ? (
            <p className="m-0 whitespace-pre-line text-[19px] leading-[1.5] text-ink [overflow-wrap:anywhere]">«{r.comment}»</p>
          ) : (
            <p className="m-0 text-[15px] italic text-muted">Avaliou sem deixar comentário.</p>
          )}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
            <Stars value={Number(r.overall)} />
            <span className="font-semibold text-ink-3">{r.author_name}</span>
            <span>·</span>
            {r.offer_title && <span>{r.offer_title} ·</span>}
            <span>{new Date(r.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}</span>
            {r.booking_id && (
              <>
                <span>·</span>
                <Link href={`/dashboard/pedidos/${r.booking_id}`} className="font-semibold">
                  Ver pedido →
                </Link>
              </>
            )}
          </div>
          {r.chef_reply ? (
            <div className="border-l-2 border-line-2 pl-3.5 text-[14px] text-ink-3">
              <span className="font-semibold">A sua resposta:</span> {r.chef_reply}
            </div>
          ) : (
            <ReviewReply id={r.id} />
          )}
        </article>
      ))}
    </div>
  );
}
