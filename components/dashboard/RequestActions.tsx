"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { chefUpdateBooking, type ChefUpdate } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

type Panel = null | "decline" | "propose";

export function RequestActions({ id, status }: { id: string; status: BookingStatus }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(update: ChefUpdate, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const r = await chefUpdateBooking(id, update);
      if (!r.ok) setError(r.error ?? "Não foi possível atualizar.");
      else setPanel(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {status === "requested" && (
          <>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run({ status: "accepted" })}>
              Aceitar
            </button>
            <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => setPanel(panel === "propose" ? null : "propose")}>
              Propor alteração
            </button>
            <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => setPanel(panel === "decline" ? null : "decline")}>
              Recusar
            </button>
          </>
        )}
        {status === "accepted" && (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run({ status: "confirmed" })}>
            Sinal recebido · confirmar
          </button>
        )}
        {status === "confirmed" && (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run({ status: "completed" })}>
            Marcar concluída
          </button>
        )}
        {["accepted", "confirmed", "change_proposed"].includes(status) && (
          <button
            type="button"
            className="btn btn-sm btn-o !border-line-2 !text-danger"
            disabled={pending}
            onClick={() => run({ status: "cancelled" }, "Cancelar esta reserva? O cliente é avisado.")}
          >
            Cancelar
          </button>
        )}
      </div>

      {panel === "decline" && (
        <div className="flex flex-col gap-3 rounded-[2px] bg-paper p-4">
          <label className="field lab">
            Motivo (o cliente vê esta mensagem)
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Já tenho um evento nesse dia" />
          </label>
          <button type="button" className="btn btn-sm self-start" disabled={pending} onClick={() => run({ status: "declined", decline_reason: reason })}>
            Recusar pedido
          </button>
        </div>
      )}
      {panel === "propose" && (
        <div className="flex flex-col gap-3 rounded-[2px] bg-paper p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3.5">
            <label className="field lab">
              Nova data
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field lab">
              Hora
              <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="20:00" />
            </label>
            <label className="field lab">
              Orçamento (€)
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Opcional" />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm self-start"
            disabled={pending || (!date && !time && !price)}
            onClick={() =>
              run({
                status: "change_proposed",
                proposed_date: date || undefined,
                proposed_time: time || undefined,
                quoted_price: price ? Number(price.replace(",", ".")) : undefined,
              })
            }
          >
            Enviar proposta
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
