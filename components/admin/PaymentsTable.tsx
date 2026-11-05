"use client";

import { useState } from "react";
import { checkPayment, markPaidManually, startRefund } from "@/app/admin/pagamentos/actions";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { AdminPaymentRow } from "@/lib/admin/payments";
import { euro, shortStamp } from "@/lib/format";

const STATUS: Record<string, string> = {
  created: "Iniciado",
  pending: "À espera do cliente",
  paid: "Pago",
  failed: "Falhou",
  expired: "Expirou",
  refunded: "Devolvido",
  partially_refunded: "Devolvido em parte",
};

const METHOD: Record<string, string> = { mbway: "MB WAY", multibanco: "Multibanco", card: "Cartão" };

/** The signals clients have paid, and the three things the team can do about one. */
export function PaymentsTable({ payments }: { payments: AdminPaymentRow[] }) {
  const [open, setOpen] = useState<{ id: string; what: "refund" | "manual" } | null>(null);
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState("");

  const check = useServerAction(checkPayment, { successMessage: "Estado atualizado a partir da EuPago." });
  const refund = useServerAction(startRefund, { successMessage: "Devolução registada." });
  const manual = useServerAction(markPaidManually, { successMessage: "Pagamento confirmado à mão." });

  return (
    <section id="pagamentos" className="box flex flex-col gap-3.5 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">Pagamentos recentes</h2>
      <FormMessage message={check.message} />
      {!payments.length && <p className="m-0 text-sm text-muted">Ainda não há pagamentos.</p>}

      <ul className="m-0 flex list-none flex-col p-0">
        {payments.map((p) => {
          const refundable = (p.status === "paid" || p.status === "partially_refunded") && p.amount > p.refunded_amount;
          return (
            <li key={p.id} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="num text-lg font-semibold">{euro(p.amount)}</span>
                <span className="text-sm">{p.booking?.ref ?? p.booking_id.slice(0, 8)}</span>
                <span className="text-sm text-muted">{METHOD[p.method] ?? p.method}</span>
                {p.refunded_amount > 0 && <span className="text-sm text-muted">· devolvido {euro(p.refunded_amount)}</span>}
                <span className="lab ml-auto text-muted">{STATUS[p.status] ?? p.status}</span>
                <span className="text-[13px] text-muted">{shortStamp(p.paid_at ?? p.created_at)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                {p.provider_reference && <span>Ref. {p.provider_reference}</span>}
                {p.provider_transaction_id && <span>Trid {p.provider_transaction_id}</span>}
                {p.phone_masked && <span>{p.phone_masked}</span>}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button type="button" className="btn btn-sm btn-o" disabled={check.pending} onClick={() => check.run(p.id)}>
                  Verificar na EuPago
                </button>
                {refundable && (
                  <button
                    type="button"
                    className="btn btn-sm btn-o"
                    onClick={() => {
                      setAmount(String(p.amount - p.refunded_amount));
                      setOpen(open?.id === p.id && open.what === "refund" ? null : { id: p.id, what: "refund" });
                    }}
                  >
                    Devolver
                  </button>
                )}
                {(p.status === "pending" || p.status === "created") && (
                  <button
                    type="button"
                    className="btn btn-sm btn-o"
                    onClick={() => setOpen(open?.id === p.id && open.what === "manual" ? null : { id: p.id, what: "manual" })}
                  >
                    Marcar como pago
                  </button>
                )}
              </div>

              {open?.id === p.id && open.what === "refund" && (
                <ReasonForm
                  label="Motivo da devolução"
                  placeholder="Chef cancelou depois de aceitar"
                  submitLabel={`Devolver ${euro(Number(amount) || 0)}`}
                  busy={refund.pending}
                  message={refund.message}
                  extra={
                    <label className="field lab">
                      <span>Valor a devolver</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={p.amount - p.refunded_amount}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <span className="hint">Até {euro(p.amount - p.refunded_amount)}. A comissão é revertida na mesma proporção.</span>
                    </label>
                  }
                  onSubmit={(reason) => refund.run({ paymentId: p.id, amount: Number(amount), reason })}
                />
              )}

              {open?.id === p.id && open.what === "manual" && (
                <ReasonForm
                  label="Motivo"
                  placeholder="Transferência recebida fora da plataforma"
                  submitLabel="Confirmar o pagamento"
                  busy={manual.pending}
                  message={manual.message}
                  extra={
                    <label className="field lab">
                      <span>Comprovativo</span>
                      <input
                        required
                        minLength={3}
                        maxLength={200}
                        value={proof}
                        onChange={(e) => setProof(e.target.value)}
                        placeholder="Referência do extrato bancário"
                      />
                      <span className="hint">Fica no registo do pagamento e em admin_logs.</span>
                    </label>
                  }
                  onSubmit={(reason) => manual.run({ paymentId: p.id, proof, reason })}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
