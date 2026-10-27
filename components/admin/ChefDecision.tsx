"use client";

import { useState } from "react";
import { moderateReview, reviewChef } from "@/app/admin/actions";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { useToggleList } from "@/hooks/useToggleList";

const BADGES: [string, string][] = [
  ["identity", "Identidade verificada"],
  ["portfolio", "Portefólio verificado"],
  ["certified", "Certificado"],
  ["founder", "Chef fundador"],
];

type Decision = "approved" | "rejected" | "suspended";

/** Approve, ask for changes or suspend a chef, with the badges to grant. */
export function ChefDecision({ chefId, badges: initial }: { chefId: string; badges: string[] }) {
  const badges = useToggleList(initial.length ? initial : ["identity", "portfolio"]);
  const [note, setNote] = useState("");
  const { run, pending, message, setMessage } = useServerAction(reviewChef, { successMessage: "Feito." });

  function decide(decision: Decision) {
    if (decision !== "approved" && !note.trim()) {
      setMessage({ ok: false, text: "Escreva o motivo: o chef recebe-o por email." });
      return;
    }
    run(chefId, decision, note.trim(), badges.items);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {BADGES.map(([key, label]) => (
          <Chip key={key} pressed={badges.has(key)} onClick={() => badges.toggle(key)}>
            {label}
          </Chip>
        ))}
      </div>
      <Field label="Nota para o chef (obrigatória para recusar ou pedir alterações)">
        <input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-sm" disabled={pending} onClick={() => decide("approved")}>
          Aprovar
        </button>
        <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => decide("rejected")}>
          Pedir alterações
        </button>
        <button
          type="button"
          className="btn btn-sm btn-o !border-line-2 !text-danger"
          disabled={pending}
          onClick={() => decide("suspended")}
        >
          Suspender
        </button>
      </div>
      <FormMessage message={message} />
    </div>
  );
}

/** Keep, hide or delete a reported review. */
export function ReviewModeration({ reviewId, reportId }: { reviewId: string; reportId: string }) {
  const { run, pending, message } = useServerAction(moderateReview);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => run(reviewId, reportId, "keep")}>
          Manter
        </button>
        <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => run(reviewId, reportId, "hide")}>
          Esconder
        </button>
        <button
          type="button"
          className="btn btn-sm btn-o !border-line-2 !text-danger"
          disabled={pending}
          onClick={() => confirm("Apagar a avaliação?") && run(reviewId, reportId, "delete")}
        >
          Apagar
        </button>
      </div>
      <FormMessage message={message} />
    </div>
  );
}
