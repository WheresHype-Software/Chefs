import type { Metadata } from "next";
import Link from "next/link";
import { PayoutDocuments } from "@/components/dashboard/PayoutDocuments";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { getBilling, getPayouts } from "@/lib/dashboard";
import { euro, shortStamp } from "@/lib/format";

export const metadata: Metadata = { title: "Pagamentos", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  due: "A pagar",
  held: "Retido",
  batched: "Em transferência",
  paid: "Pago",
  cancelled: "Anulado",
};

export default async function Pagamentos() {
  const [{ summary, payouts, documents }, { readiness }] = await Promise.all([getPayouts(), getBilling()]);
  const ready =
    readiness.hasFiscal &&
    readiness.hasDac7 &&
    readiness.hasIban &&
    readiness.ibanApproved &&
    (readiness.agreementVersion ?? 0) >= readiness.requiredAgreementVersion;

  return (
    <div className="flex flex-col gap-[26px]">
      <PageHeader
        title="Pagamentos"
        description="O cliente paga o sinal na app. Depois de cada serviço concluído, transferimos-te esse sinal menos a nossa comissão."
      />

      {!ready && (
        <section className="box flex flex-col gap-2.5 border-2 border-cobalt p-[22px]">
          <h2 className="d m-0 text-[22px] font-normal">Falta preencher a faturação</h2>
          <p className="m-0 text-sm text-muted">
            Sem os teus dados fiscais, o IBAN verificado e o contrato aceite não podemos transferir-te nada. O dinheiro fica à tua espera,
            não se perde.
          </p>
          <Link href="/dashboard/faturacao" className="btn btn-sm self-start">
            Completar agora
          </Link>
        </section>
      )}

      <StatGrid
        items={[
          ["Saldo a teu favor", euro(summary.balance)],
          ["Pronto a transferir", euro(summary.due)],
          ["Ainda em retenção", euro(summary.waiting)],
          ["Pago este ano", euro(summary.paidThisYear)],
        ]}
      />

      <section className="box flex flex-col gap-3.5 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">Movimentos</h2>
        {payouts.length === 0 ? (
          <p className="m-0 text-sm text-muted">Ainda não há pagamentos. Aparecem aqui depois do primeiro serviço concluído.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0">
                <span className="num text-lg font-semibold">{euro(p.amount)}</span>
                <span className="text-sm">{p.booking ? `${p.booking.offer_title} · ${p.booking.ref}` : (p.reason ?? "Acerto")}</span>
                <span className="ml-auto flex flex-col items-end">
                  <span className="lab text-muted">{STATUS_LABEL[p.status] ?? p.status}</span>
                  <span className="text-[13px] text-muted">
                    {p.status === "paid" && p.paid_at ? shortStamp(p.paid_at) : `previsto ${shortStamp(p.due_at)}`}
                  </span>
                </span>
                {p.hold_reason && <span className="w-full text-sm text-muted">Retido: {p.hold_reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <PayoutDocuments documents={documents} />
    </div>
  );
}
