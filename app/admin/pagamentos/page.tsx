import type { Metadata } from "next";
import Link from "next/link";
import { StatGrid } from "@/components/ui/StatGrid";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasEupago } from "@/lib/env.server";
import { euro } from "@/lib/format";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pagamentos", robots: { index: false } };

/** O que aconteceu ao dinheiro este mês, e o que está à espera de alguém. */
export default async function PagamentosResumo() {
  if (!hasSupabase) return null;
  const view = await getAdminPayments();

  const needsApproval = view.accounts.filter((a) => a.iban_last4 && !a.iban_approved_at).length;
  const toTransfer = view.refunds.filter((r) => r.status === "manual_pending").length;
  const needsIban = view.refunds.filter((r) => r.status === "needs_iban").length;

  // Só entra aqui o que tem alguém à espera do outro lado.
  const todo = [
    { n: view.readyPayoutIds.length, href: "/admin/pagamentos/lotes", one: "pagamento pronto a sair", many: "pagamentos prontos a sair" },
    { n: needsApproval, href: "/admin/pagamentos/contas", one: "conta de chef por verificar", many: "contas de chef por verificar" },
    { n: toTransfer, href: "/admin/pagamentos/devolucoes", one: "devolução por transferir à mão", many: "devoluções por transferir à mão" },
    {
      n: needsIban,
      href: "/admin/pagamentos/devolucoes",
      one: "devolução à espera do IBAN do cliente",
      many: "devoluções à espera do IBAN do cliente",
    },
  ].filter((t) => t.n > 0);

  return (
    <>
      {!hasEupago && (
        <p className="box m-0 border-2 border-cobalt p-4 text-sm">
          <strong>A EuPago ainda não está configurada.</strong> Falta a chave de API ou a chave de cifra no servidor, por isso nenhum
          pagamento pode ser iniciado, mesmo com os pagamentos ligados.
        </p>
      )}

      <StatGrid
        size="md"
        items={[
          ["Sinais recebidos (mês)", euro(view.totals.depositsThisMonth)],
          ["Comissão (mês)", euro(view.totals.commissionThisMonth)],
          ["Devolvido (mês)", euro(view.totals.refundedThisMonth)],
          ["A pagar aos chefs", euro(view.totals.owed)],
        ]}
      />

      <section className="box flex flex-col gap-3 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">À sua espera</h2>
        {todo.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {todo.map((t) => (
              <li key={`${t.href}-${t.one}`}>
                <Link href={t.href} className="font-semibold">
                  {t.n} {t.n === 1 ? t.one : t.many} →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">
            Nada por decidir. Os sinais entram sozinhos e os pagamentos saem quando a retenção passa.
          </p>
        )}
      </section>
    </>
  );
}
