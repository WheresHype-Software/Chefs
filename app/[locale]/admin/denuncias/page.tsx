import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AprovacoesTabs } from "@/components/admin/AprovacoesTabs";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { getReportedReviews } from "@/lib/admin/queues";
import { getSession } from "@/lib/dashboard";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Denúncias", robots: { index: false } };

export default async function DenunciasPage() {
  if (!hasSupabase) notFound();
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();
  const reports = await getReportedReviews();

  return (
    <AdminShell title="Avaliações denunciadas">
      <AprovacoesTabs />
      <section className="flex flex-col gap-4">
        {reports.length ? (
          reports.map((r) => (
            <article key={r.reportId} className="box flex flex-col gap-3 p-5">
              <span className="lab text-muted">
                {r.chefName} · {r.author_name} · ★ {r.overall}
              </span>
              <p className="m-0">{r.comment}</p>
              <span className="text-sm text-danger">Motivo: {r.reason}</span>
              <ReviewModeration reviewId={r.id} reportId={r.reportId} />
            </article>
          ))
        ) : (
          <p className="m-0 text-muted">Nada denunciado.</p>
        )}
      </section>
    </AdminShell>
  );
}
