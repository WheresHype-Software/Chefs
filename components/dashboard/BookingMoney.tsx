"use client";

import { useState } from "react";
import { setRestPaid } from "@/app/dashboard/actions/money";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { DashBooking } from "@/lib/dashboard";
import { euro, shortStamp } from "@/lib/format";

const DEPOSIT_LABEL: Record<string, string> = {
  not_required: "Sem sinal",
  due: "À espera do cliente",
  pending: "A pagar agora",
  paid: "Pago",
  overdue: "Prazo passou",
  refunded: "Devolvido",
  partially_refunded: "Devolvido em parte",
};

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={`m-0 text-[15px] ${muted ? "text-muted" : ""}`}>{label}</dt>
      <dd className={`num m-0 ${strong ? "text-[20px] font-semibold" : "text-[15px]"} ${muted ? "text-muted" : ""}`}>{value}</dd>
    </div>
  );
}

/**
 * The whole account of one booking, from the chef's side: what the client pays in total, what
 * came through the app, what we keep, what we transfer, and what the client still owes them
 * directly. Two different pockets, so they are shown as two blocks rather than one running total.
 */
export function BookingMoney({ booking }: { booking: DashBooking }) {
  const total = booking.booking_value ?? booking.quoted_price ?? booking.estimate ?? 0;
  const deposit = booking.deposit_amount ?? 0;
  const commission = booking.commission_amount ?? 0;
  const payout = booking.payout_amount ?? 0;
  const rest = Math.max(0, Math.round((total - deposit) * 100) / 100);
  const paidDeposit = booking.deposit_status === "paid";
  const restDone = booking.rest_paid_at != null;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(rest));
  const { run, pending, message } = useServerAction(setRestPaid, { successMessage: "Guardado." });

  // Before the chef accepts there is nothing to show: the amounts are not decided yet.
  if (!booking.deposit_amount && booking.deposit_status === "not_required") {
    return (
      <section className="box flex flex-col gap-2 p-6">
        <h2 className="d m-0 text-[22px] font-normal">Dinheiro</h2>
        <p className="m-0 text-sm text-muted">
          {total > 0 ? `Valor estimado: ${euro(total)}.` : "Valor por orçamentar."} Os valores ficam fixados quando aceitares o pedido.
        </p>
      </section>
    );
  }

  return (
    <section className="box flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="d m-0 text-[22px] font-normal">Dinheiro</h2>
        <span className="lab text-muted">{DEPOSIT_LABEL[booking.deposit_status] ?? booking.deposit_status}</span>
      </div>

      <dl className="m-0 flex flex-col gap-2.5">
        <Row label="Valor do serviço" value={euro(total)} />
      </dl>

      <div className="flex flex-col gap-2.5 border-t border-line pt-4">
        <span className="lab text-muted">Pelo Ao Lume</span>
        <dl className="m-0 flex flex-col gap-2.5">
          <Row label="Sinal do cliente" value={euro(deposit)} muted={!paidDeposit} />
          <Row label="Comissão Ao Lume" value={`− ${euro(commission)}`} muted />
          <Row label={paidDeposit ? "Recebes de nós" : "Receberás de nós"} value={euro(payout)} strong />
        </dl>
        <span className="text-[13px] text-muted">
          {paidDeposit
            ? `Sinal pago ${booking.deposit_paid_at ? shortStamp(booking.deposit_paid_at) : ""}. Transferimos depois do serviço concluído.`
            : "Transferimos depois de o cliente pagar e o serviço estar concluído."}
        </span>
      </div>

      {rest > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <span className="lab text-muted">Diretamente contigo</span>
          <dl className="m-0 flex flex-col gap-2.5">
            <Row
              label={restDone ? "Recebido do cliente" : "O cliente ainda te deve"}
              value={euro(restDone ? (booking.rest_paid_amount ?? rest) : rest)}
              strong
            />
          </dl>

          {restDone ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-ok">Marcado como recebido {shortStamp(booking.rest_paid_at!)}.</span>
              <button
                type="button"
                className="btn btn-sm btn-o"
                disabled={pending}
                onClick={() => run({ bookingId: booking.id, paid: false })}
              >
                Afinal não recebi
              </button>
            </div>
          ) : open ? (
            <form
              className="flex flex-col gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                run({ bookingId: booking.id, paid: true, amount: Number(amount) });
              }}
            >
              <label className="field lab">
                <span>Quanto recebeste</span>
                <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <span className="hint">Fica só para a tua conta. Não é cobrado nem transferido por nós.</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-sm" disabled={pending}>
                  {pending ? "A guardar…" : "Marcar como recebido"}
                </button>
                <button type="button" className="btn btn-sm btn-o" onClick={() => setOpen(false)} disabled={pending}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn btn-sm btn-o self-start" onClick={() => setOpen(true)}>
              O cliente já me pagou o resto
            </button>
          )}
        </div>
      )}

      <FormMessage message={message} />
    </section>
  );
}
