import { ReviewReply } from "@/components/dashboard/ReviewReply";
import { PageHeader } from "@/components/ui/PageHeader";
import { getReviews, requireChef } from "@/lib/dashboard";
import { rating } from "@/lib/format";

export default async function Avaliacoes() {
  const chef = await requireChef();
  const reviews = await getReviews();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Avaliações · ${rating(chef.rating_avg, chef.review_count)}`}
        title="O que dizem os seus clientes"
        description="Só clientes com reserva concluída avaliam. Pode responder uma vez a cada avaliação, e denunciar avaliações abusivas: a equipa decide."
      />
      {reviews.length === 0 && (
        <p className="m-0 text-muted">Ainda sem avaliações. O pedido de avaliação é enviado 24 horas depois de cada reserva concluída.</p>
      )}
      {reviews.map((r) => (
        <article key={r.id} className="box flex flex-col gap-3 p-6">
          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <strong className="font-semibold">
              {r.author_name} · ★ {Number(r.overall).toFixed(1).replace(".", ",")}
            </strong>
            <span className="text-muted">
              {r.offer_title ? `${r.offer_title} · ` : ""}
              {new Date(r.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
            </span>
          </div>
          {r.comment && <p className="m-0">{r.comment}</p>}
          {r.chef_reply ? (
            <div className="rounded-[2px] bg-paper px-3.5 py-3 text-sm">
              <strong className="font-semibold">A sua resposta:</strong> {r.chef_reply}
            </div>
          ) : (
            <ReviewReply id={r.id} />
          )}
        </article>
      ))}
    </div>
  );
}
