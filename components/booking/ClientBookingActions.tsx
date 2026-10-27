"use client";

import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { clientAction, submitReview } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

const CANCELLABLE: BookingStatus[] = ["requested", "accepted", "change_proposed", "confirmed"];

/** Cancel, or accept the chef's proposed change, from the booking status page. */
export function ClientBookingActions({ id, status }: { id: string; status: BookingStatus }) {
  const { run, pending, message } = useServerAction(clientAction);
  if (!CANCELLABLE.includes(status)) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        {status === "change_proposed" && (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, "accept_proposal")}>
            Aceitar proposta
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-o !border-line-2 !text-danger"
          disabled={pending}
          onClick={() => confirm("Cancelar este pedido? O chef é avisado.") && run(id, "cancel")}
        >
          Cancelar pedido
        </button>
      </div>
      <FormMessage message={message} />
    </div>
  );
}

const CATEGORIES = [
  ["food", "Comida"],
  ["presentation", "Apresentação"],
  ["punctuality", "Pontualidade"],
  ["communication", "Comunicação"],
  ["value", "Qualidade/preço"],
] as const;

type Scores = Record<(typeof CATEGORIES)[number][0], number>;

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <fieldset className="m-0 flex flex-wrap items-center justify-between gap-3 border-0 border-b border-line px-0 py-3">
      <legend className="float-left p-0 text-[15px]">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`ctl !h-9 !w-9 !text-base ${value >= n ? "!border-cobalt !bg-cobalt !text-white" : ""}`}
            aria-label={`${label}: ${n} de 5`}
            aria-pressed={value >= n}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Category stars, comment and showcase consent, once the booking is completed. */
export function ReviewForm({ id, chef }: { id: string; chef: string }) {
  const [scores, setScores] = useState<Scores>({ food: 0, presentation: 0, punctuality: 0, communication: 0, value: 0 });
  const [comment, setComment] = useState("");
  const [allowShowcase, setAllowShowcase] = useState(true);
  const [done, setDone] = useState(false);
  const { run, pending, message } = useServerAction(submitReview, { onSuccess: () => setDone(true) });
  const ready = Object.values(scores).every((v) => v > 0);

  if (done) {
    return (
      <div className="box p-6">
        <h2 className="d m-0 text-[28px]">Obrigado pela avaliação</h2>
        <p className="m-0 mt-2 text-muted">{chef} vai recebê-la e pode responder publicamente.</p>
      </div>
    );
  }

  return (
    <form
      className="box flex flex-col gap-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) run(id, { scores, comment, allowShowcase });
      }}
    >
      <h2 className="d m-0 text-[28px]">Como correu com {chef}?</h2>
      <div className="flex flex-col">
        {CATEGORIES.map(([key, label]) => (
          <StarRating key={key} label={label} value={scores[key]} onChange={(n) => setScores((s) => ({ ...s, [key]: n }))} />
        ))}
      </div>
      <label className="field lab">
        Comentário
        <textarea
          rows={4}
          maxLength={3000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="O que correu bem? O que pediu?"
        />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={allowShowcase} onChange={(e) => setAllowShowcase(e.target.checked)} className="mt-1 accent-ink" />
        Autorizo que o resumo desta reserva apareça no perfil do chef.
      </label>
      <FormMessage message={message} />
      <button type="submit" className="btn self-start" disabled={!ready || pending}>
        Publicar avaliação
      </button>
    </form>
  );
}
