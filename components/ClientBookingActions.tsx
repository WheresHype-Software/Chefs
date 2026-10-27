"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clientAction, submitReview } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

export function ClientBookingActions({ id, token, status }: { id: string; token: string | null; status: BookingStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: "cancel" | "accept_proposal") {
    if (action === "cancel" && !confirm("Cancelar este pedido? O chef é avisado.")) return;
    start(async () => {
      const r = await clientAction(id, action, token);
      if (!r.ok) setError("Não foi possível concluir. Tente de novo.");
      router.refresh();
    });
  }

  const canCancel = ["requested", "accepted", "change_proposed", "confirmed"].includes(status);
  if (!canCancel) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        {status === "change_proposed" && (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run("accept_proposal")}>
            Aceitar proposta
          </button>
        )}
        <button type="button" className="btn btn-sm btn-o !border-line-2 !text-danger" disabled={pending} onClick={() => run("cancel")}>
          Cancelar pedido
        </button>
      </div>
      {error && <p role="alert" className="m-0 text-sm text-danger">{error}</p>}
    </div>
  );
}

const CATS = [
  ["food", "Comida"],
  ["presentation", "Apresentação"],
  ["punctuality", "Pontualidade"],
  ["communication", "Comunicação"],
  ["value", "Qualidade/preço"],
] as const;

type Scores = Record<(typeof CATS)[number][0], number>;

export function ReviewForm({ id, token, chef }: { id: string; token: string | null; chef: string }) {
  const router = useRouter();
  const [scores, setScores] = useState<Scores>({ food: 0, presentation: 0, punctuality: 0, communication: 0, value: 0 });
  const [comment, setComment] = useState("");
  const [showcase, setShowcase] = useState(true);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
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
        if (!ready) return;
        start(async () => {
          const r = await submitReview(id, scores, comment, showcase, token);
          if (r.ok) {
            setDone(true);
            router.refresh();
          }
        });
      }}
    >
      <h2 className="d m-0 text-[28px]">Como correu com {chef}?</h2>
      <div className="flex flex-col">
        {CATS.map(([k, label]) => (
          <fieldset key={k} className="m-0 flex flex-wrap items-center justify-between gap-3 border-0 border-b border-line px-0 py-3">
            <legend className="float-left p-0 text-[15px]">{label}</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="ctl !h-9 !w-9 !text-base"
                  aria-label={`${label}: ${n} de 5`}
                  aria-pressed={scores[k] >= n}
                  style={scores[k] >= n ? { background: "#111110", color: "#fff", borderColor: "#111110" } : undefined}
                  onClick={() => setScores((s) => ({ ...s, [k]: n }))}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <label className="field lab">
        Comentário
        <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="O que correu bem? O que pediu?" />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={showcase} onChange={(e) => setShowcase(e.target.checked)} className="mt-1 accent-ink" />
        Autorizo que o resumo desta reserva apareça no perfil do chef.
      </label>
      <button type="submit" className="btn self-start" disabled={!ready || pending}>
        Publicar avaliação
      </button>
    </form>
  );
}
