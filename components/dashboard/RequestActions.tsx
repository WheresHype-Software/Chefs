"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { chefUpdateBooking } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

type Panel = null | "decline" | "propose";

/** The chef's next steps for a booking, depending on its status. */
export function RequestActions({ id, status }: { id: string; status: BookingStatus }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [proposal, setProposal] = useState({ date: "", time: "", price: "" });
  const { run, pending, message } = useServerAction(chefUpdateBooking, { onSuccess: () => setPanel(null) });
  const toggle = (p: Panel) => setPanel((current) => (current === p ? null : p));

  function sendProposal() {
    const price = proposal.price ? Number(proposal.price.replace(",", ".")) : undefined;
    run(id, {
      status: "change_proposed",
      proposed_date: proposal.date || undefined,
      proposed_time: proposal.time || undefined,
      quoted_price: Number.isFinite(price) ? price : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {status === "requested" && (
          <>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, { status: "accepted" })}>
              Aceitar
            </button>
            <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => toggle("propose")}>
              Propor alteração
            </button>
            <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => toggle("decline")}>
              Recusar
            </button>
          </>
        )}
        {status === "accepted" && (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, { status: "confirmed" })}>
            Sinal recebido · confirmar
          </button>
        )}
        {status === "confirmed" && (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, { status: "completed" })}>
            Marcar concluída
          </button>
        )}
        {(status === "accepted" || status === "confirmed" || status === "change_proposed") && (
          <button
            type="button"
            className="btn btn-sm btn-o !border-line-2 !text-danger"
            disabled={pending}
            onClick={() => confirm("Cancelar esta reserva? O cliente é avisado.") && run(id, { status: "cancelled" })}
          >
            Cancelar
          </button>
        )}
      </div>

      {panel === "decline" && (
        <div className="flex flex-col gap-3 rounded-[2px] bg-paper p-4">
          <Field label="Motivo (o cliente vê esta mensagem)">
            <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Já tenho um evento nesse dia" />
          </Field>
          <button
            type="button"
            className="btn btn-sm self-start"
            disabled={pending}
            onClick={() => run(id, { status: "declined", decline_reason: reason || undefined })}
          >
            Recusar pedido
          </button>
        </div>
      )}

      {panel === "propose" && (
        <div className="flex flex-col gap-3 rounded-[2px] bg-paper p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3.5">
            <Field label="Nova data">
              <input type="date" value={proposal.date} onChange={(e) => setProposal((p) => ({ ...p, date: e.target.value }))} />
            </Field>
            <Field label="Hora">
              <input value={proposal.time} onChange={(e) => setProposal((p) => ({ ...p, time: e.target.value }))} placeholder="20:00" />
            </Field>
            <Field label="Orçamento (€)">
              <input
                inputMode="decimal"
                value={proposal.price}
                onChange={(e) => setProposal((p) => ({ ...p, price: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
          </div>
          <button
            type="button"
            className="btn btn-sm self-start"
            disabled={pending || (!proposal.date && !proposal.time && !proposal.price)}
            onClick={sendProposal}
          >
            Enviar proposta
          </button>
        </div>
      )}

      <FormMessage message={message} />
    </div>
  );
}
