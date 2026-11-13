import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import { AprovacoesTabs } from "@/components/admin/AprovacoesTabs";
import { StatGrid } from "@/components/ui/StatGrid";
import { emailHealth } from "@/lib/admin/health";
import { getAdminStats, getPendingChefs } from "@/lib/admin/queues";
import { getSession } from "@/lib/dashboard";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };

/** A fila que custa dinheiro deixar à espera: quem se candidatou e ainda não sabe. */
export default async function AdminPage() {
  if (!hasSupabase) {
    return (
      <AdminShell title="Administração">
        <p className="m-0 text-muted">A administração liga-se quando o projeto Supabase estiver configurado.</p>
      </AdminShell>
    );
  }
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();

  const [pending, stats, mail] = await Promise.all([getPendingChefs(), getAdminStats(), emailHealth()]);

  return (
    <AdminShell title="Administração">
      <AprovacoesTabs />
      {mail.state !== "ok" && (
        <p className="box m-0 border-2 border-cobalt p-4 text-sm">
          <strong>{mail.state === "off" ? "Os emails não estão a ser enviados." : "Os emails estão a falhar."}</strong> {mail.detail} Isto
          afeta tudo: avisos de pedidos novos, aprovações, pagamentos e apoio.
        </p>
      )}

      <StatGrid
        size="md"
        items={[
          ["Chefs ativos", String(stats.activeChefs)],
          ["Pedidos (7 dias)", String(stats.requests)],
          ["Taxa de aceitação", stats.acceptance === null ? "—" : `${stats.acceptance} %`],
          ["Concluídas (7 dias)", String(stats.completed)],
          ["Avaliações (7 dias)", String(stats.reviews)],
        ]}
      />

      <section className="flex flex-col gap-4">
        <h2 className="lab m-0 border-b border-line-2 pb-2.5">Perfis por aprovar · {pending.length}</h2>
        <ApprovalQueue chefs={pending} />
      </section>
    </AdminShell>
  );
}
