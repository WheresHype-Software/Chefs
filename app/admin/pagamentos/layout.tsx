import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { getAdminPayments } from "@/lib/admin/payments";
import { getSession } from "@/lib/dashboard";
import { hasSupabase } from "@/lib/supabase/server";

/**
 * O enquadramento das páginas de dinheiro: a sessão confirmada uma vez, e as secções com o que
 * espera por uma decisão. As contagens vêm da mesma leitura que as páginas usam, porque o
 * getAdminPayments está dentro de um cache() por render.
 */
export default async function PagamentosLayout({ children }: { children: ReactNode }) {
  if (!hasSupabase) {
    return (
      <AdminShell title="Pagamentos">
        <p className="m-0 text-muted">Os pagamentos ligam-se quando o projeto Supabase estiver configurado.</p>
      </AdminShell>
    );
  }
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();

  const view = await getAdminPayments();
  const needsApproval = view.accounts.filter((a) => a.iban_last4 && !a.iban_approved_at).length;

  return (
    <AdminShell title="Pagamentos">
      <AdminTabs
        tabs={[
          { href: "/admin/pagamentos", label: "Resumo" },
          { href: "/admin/pagamentos/lotes", label: "Pagar aos chefs", count: view.readyPayoutIds.length },
          { href: "/admin/pagamentos/devolucoes", label: "Devoluções", count: view.refunds.length },
          { href: "/admin/pagamentos/contas", label: "Contas", count: needsApproval },
          { href: "/admin/pagamentos/movimentos", label: "Movimentos" },
          { href: "/admin/pagamentos/documentos", label: "Documentos" },
          { href: "/admin/pagamentos/definicoes", label: "Definições" },
        ]}
      />
      {children}
    </AdminShell>
  );
}
