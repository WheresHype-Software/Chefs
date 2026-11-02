"use client";

import { useState } from "react";
import { replyToReview, reportReview } from "@/app/dashboard/actions/reviews";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";

/** Public one-time reply to a review, or a report to the team. */
export function ReviewReply({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const reply = useServerAction(replyToReview, { successMessage: "Resposta publicada." });
  const report = useServerAction(reportReview, { successMessage: "Denúncia enviada à equipa.", refresh: false });
  const pending = reply.pending || report.pending;

  function askReport() {
    const reason = prompt("Porque é que esta avaliação é abusiva?");
    if (reason?.trim()) report.run(id, reason.trim());
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
        <button type="button" className="font-semibold text-cobalt hover:underline" onClick={() => setOpen(true)}>
          Responder
        </button>
        <button type="button" className="text-muted hover:underline" disabled={pending} onClick={askReport}>
          Denunciar
        </button>
        <FormMessage message={report.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Field label="Resposta pública (só pode responder uma vez)">
        <textarea rows={3} maxLength={2000} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" disabled={pending || !text.trim()} onClick={() => reply.run(id, text)}>
          Publicar resposta
        </button>
        <button type="button" className="btn btn-sm btn-o !border-line-2" disabled={pending} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
      <FormMessage message={reply.message ?? report.message} />
    </div>
  );
}
