"use client";

import { useState } from "react";
import { addAdjustment, approveChefIban, setPayoutsBlocked } from "@/app/admin/pagamentos/actions";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { AdminChefAccount } from "@/lib/admin/payments";
import { euro, shortStamp } from "@/lib/format";

/**
 * The chefs' bank details and standing.
 *
 * Approving an IBAN is the one manual check that stands between an account takeover and a
 * payout: a new or changed account is never paid until somebody here has looked at it.
 */
export function ChefAccounts({ accounts }: { accounts: AdminChefAccount[] }) {
  const [open, setOpen] = useState<{ id: string; what: "block" | "adjust" } | null>(null);
  const [amount, setAmount] = useState("");

  const approve = useServerAction(approveChefIban, { successMessage: "Conta verificada." });
  const block = useServerAction(setPayoutsBlocked, { successMessage: "Guardado." });
  const adjust = useServerAction(addAdjustment, { successMessage: "Acerto lançado." });

  return (
    <section id="chefs" className="box flex flex-col gap-3.5 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">Chefs e contas</h2>
      <FormMessage message={approve.message} />
      {!accounts.length && <p className="m-0 text-sm text-muted">Ainda não há chefs com dados de faturação.</p>}

      <ul className="m-0 flex list-none flex-col p-0">
        {accounts.map((a) => {
          const needsApproval = a.iban_last4 && !a.iban_approved_at;
          return (
            <li key={a.chef_id} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-semibold">{a.display_name}</span>
                <span className="text-sm text-muted">{a.legal_name ?? "sem nome legal"}</span>
                <span className="num text-sm text-muted">{a.nif ? `NIF ${a.nif}` : "sem NIF"}</span>
                <span className="num ml-auto text-sm">{a.iban_last4 ? `•••• ${a.iban_last4}` : "sem IBAN"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                {needsApproval && <span className="font-semibold text-ink">Conta por verificar</span>}
                {a.iban_changed_at && <span>alterada {shortStamp(a.iban_changed_at)}</span>}
                {a.payout_hold_until && new Date(a.payout_hold_until) > new Date() && (
                  <span>retido até {shortStamp(a.payout_hold_until)}</span>
                )}
                {a.payouts_blocked && <span className="text-danger">bloqueado: {a.payouts_blocked_reason}</span>}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {needsApproval && (
                  <button type="button" className="btn btn-sm" disabled={approve.pending} onClick={() => approve.run(a.chef_id)}>
                    Verificar a conta
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-o"
                  onClick={() => setOpen(open?.id === a.chef_id && open.what === "adjust" ? null : { id: a.chef_id, what: "adjust" })}
                >
                  Lançar acerto
                </button>
                {a.payouts_blocked ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-o"
                    disabled={block.pending}
                    onClick={() => block.run({ chefId: a.chef_id, blocked: false, reason: "" })}
                  >
                    Desbloquear pagamentos
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-o !border-line-2 !text-danger"
                    onClick={() => setOpen(open?.id === a.chef_id && open.what === "block" ? null : { id: a.chef_id, what: "block" })}
                  >
                    Bloquear pagamentos
                  </button>
                )}
              </div>

              {open?.id === a.chef_id && open.what === "block" && (
                <ReasonForm
                  label="Motivo do bloqueio"
                  placeholder="Suspeita de fraude · a confirmar identidade"
                  submitLabel="Bloquear"
                  danger
                  busy={block.pending}
                  message={block.message}
                  onSubmit={(reason) => block.run({ chefId: a.chef_id, blocked: true, reason })}
                />
              )}

              {open?.id === a.chef_id && open.what === "adjust" && (
                <ReasonForm
                  label="Motivo do acerto"
                  placeholder="Compensação por cancelamento do cliente"
                  submitLabel="Lançar"
                  busy={adjust.pending}
                  message={adjust.message}
                  extra={
                    <label className="field lab">
                      <span>Valor (negativo para descontar)</span>
                      <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25.00" />
                      <span className="hint">
                        {Number(amount) > 0
                          ? `A pagar ao chef: ${euro(Number(amount))}`
                          : Number(amount) < 0
                            ? `A descontar: ${euro(Math.abs(Number(amount)))}`
                            : "Entra no próximo lote."}
                      </span>
                    </label>
                  }
                  onSubmit={(reason) => adjust.run({ chefId: a.chef_id, amount: Number(amount), reason })}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
