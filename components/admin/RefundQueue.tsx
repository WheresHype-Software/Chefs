"use client";

import { useState } from "react";
import { completeManualRefund, revealRefundIban } from "@/app/admin/pagamentos/actions";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { AdminRefundRow } from "@/lib/admin/payments";
import { callAction } from "@/lib/call-action";
import { euro, shortStamp } from "@/lib/format";

const STATUS: Record<string, string> = {
  requested: "A enviar pela EuPago",
  needs_iban: "À espera do IBAN do cliente",
  manual_pending: "Pronta a transferir",
  sent: "Enviada",
  failed: "Falhou",
};

/**
 * Refunds that are not finished. The ones that matter are `manual_pending`: a Multibanco payment
 * cannot be reversed, so the client gave us an IBAN and somebody has to make the transfer at the
 * bank and come back here to close it.
 */
export function RefundQueue({ refunds }: { refunds: AdminRefundRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, { iban: string; holder: string | null }>>({});
  const [revealError, setRevealError] = useState<string | null>(null);
  const { run, pending, message } = useServerAction(completeManualRefund, { successMessage: "Devolução fechada." });

  if (!refunds.length) {
    return (
      <section id="devolucoes" className="box flex flex-col gap-2 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">Devoluções</h2>
        <p className="m-0 text-sm text-muted">Nada por tratar.</p>
      </section>
    );
  }

  async function reveal(id: string) {
    setRevealError(null);
    const result = await callAction(() => revealRefundIban(id));
    if (!result.ok) {
      setRevealError(result.error);
      return;
    }
    setRevealed((r) => ({ ...r, [id]: { iban: result.iban, holder: result.holder } }));
  }

  return (
    <section id="devolucoes" className="box flex flex-col gap-3.5 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">Devoluções ({refunds.length})</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {refunds.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 border-b border-line pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="num text-lg font-semibold">{euro(r.amount)}</span>
              <span className="text-sm">{r.booking?.ref ?? r.booking_id.slice(0, 8)}</span>
              <span className="text-sm text-muted">· {r.reason}</span>
              <span className="lab ml-auto text-muted">{STATUS[r.status] ?? r.status}</span>
              <span className="text-[13px] text-muted">{shortStamp(r.created_at)}</span>
            </div>

            {r.status === "manual_pending" && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-3 text-sm">
                  <span className="text-muted">
                    Conta do cliente: {r.client_iban_holder ?? "titular não indicado"} · ••••{r.client_iban_last4}
                  </span>
                  {revealed[r.id] ? (
                    <span className="num select-all font-semibold">{revealed[r.id]!.iban}</span>
                  ) : (
                    <button type="button" className="btn btn-sm btn-o" onClick={() => void reveal(r.id)}>
                      Mostrar o IBAN
                    </button>
                  )}
                </div>
                {revealError && <FormMessage message={{ ok: false, text: revealError }} />}
                <p className="m-0 text-xs text-muted">Cada vez que o IBAN é mostrado fica registado em admin_logs.</p>

                {open === r.id ? (
                  <ReasonForm
                    label="Referência da transferência"
                    placeholder="TRF-2026-00123"
                    submitLabel="Marcar como devolvida"
                    busy={pending}
                    message={message}
                    onSubmit={(bankReference) => run({ refundId: r.id, bankReference })}
                  />
                ) : (
                  <button type="button" className="btn btn-sm self-start" onClick={() => setOpen(r.id)}>
                    Já transferi
                  </button>
                )}
              </div>
            )}

            {r.status === "needs_iban" && (
              <p className="m-0 text-sm text-muted">
                Pedimos o IBAN ao cliente na página da reserva dele. Assim que o indicar, aparece aqui para transferir.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
