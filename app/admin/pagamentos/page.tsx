import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminQueueNav } from "@/components/admin/AdminQueueNav";
import { ChefAccounts } from "@/components/admin/ChefAccounts";
import { Dac7Export } from "@/components/admin/Dac7Export";
import { PaymentSettingsForm } from "@/components/admin/PaymentSettingsForm";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { PayoutBatches } from "@/components/admin/PayoutBatches";
import { PayoutDocumentList } from "@/components/admin/PayoutDocumentList";
import { RefundQueue } from "@/components/admin/RefundQueue";
import { StatGrid } from "@/components/ui/StatGrid";
import { getAdminPayments } from "@/lib/admin/payments";
import { getSession } from "@/lib/dashboard";
import { hasEupago } from "@/lib/env.server";
import { euro } from "@/lib/format";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pagamentos", robots: { index: false } };

export default async function AdminPagamentos() {
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
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2];
  const needsApproval = view.accounts.filter((a) => a.iban_last4 && !a.iban_approved_at).length;
  const toTransfer = view.refunds.filter((r) => r.status === "manual_pending").length;

  return (
    <AdminShell title="Pagamentos">
      <AdminQueueNav
        queues={[
          { id: "devolucoes", label: "Devoluções", count: view.refunds.length },
          { id: "lotes", label: "Por pagar aos chefs", count: view.duePayouts.filter((p) => p.status === "due").length },
          { id: "chefs", label: "Contas por verificar", count: needsApproval },
          { id: "pagamentos", label: "Pagamentos", count: view.payments.length },
          { id: "documentos", label: "Documentos", count: view.documents.length },
          { id: "dac7", label: "DAC7", count: 0 },
          { id: "definicoes", label: "Definições", count: 0 },
        ]}
      />

      <StatGrid
        size="md"
        items={[
          ["Sinais recebidos (mês)", euro(view.totals.depositsThisMonth)],
          ["Comissão (mês)", euro(view.totals.commissionThisMonth)],
          ["Devolvido (mês)", euro(view.totals.refundedThisMonth)],
          ["A pagar aos chefs", euro(view.totals.owed)],
          ["Transferências à mão", String(toTransfer)],
        ]}
      />

      {!hasEupago && (
        <p className="box m-0 border-2 border-cobalt p-4 text-sm">
          <strong>A EuPago ainda não está configurada.</strong> Falta a chave de API ou a chave de cifra no servidor, por isso nenhum
          pagamento pode ser iniciado, mesmo com os pagamentos ligados aqui.
        </p>
      )}

      <RefundQueue refunds={view.refunds} />
      <PayoutBatches batches={view.batches} duePayouts={view.duePayouts} owed={view.totals.owed} />
      <ChefAccounts accounts={view.accounts} />
      <PaymentsTable payments={view.payments} />
      <PayoutDocumentList documents={view.documents} />
      <Dac7Export years={years} />
      <PaymentSettingsForm settings={view.settings} providerReady={hasEupago} />
    </AdminShell>
  );
}
