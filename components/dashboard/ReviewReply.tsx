"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { replyToReview, reportReview } from "@/app/dashboard/actions";

export function ReviewReply({ id }: { id: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2.5">
      <label className="field lab">
        Resposta pública (só pode responder uma vez)
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              const r = await replyToReview(id, text);
              setMsg(r.ok ? "Resposta publicada." : r.error);
              router.refresh();
            })
          }
        >
          Responder
        </button>
        <button
          type="button"
          className="btn btn-sm btn-o !border-line-2"
          disabled={pending}
          onClick={() => {
            const reason = prompt("Porque é que esta avaliação é abusiva?");
            if (!reason) return;
            start(async () => {
              const r = await reportReview(id, reason);
              setMsg(r.ok ? "Denúncia enviada à equipa." : r.error);
            });
          }}
        >
          Denunciar
        </button>
      </div>
      {msg && (
        <p role="status" className="m-0 text-sm text-muted">
          {msg}
        </p>
      )}
    </div>
  );
}
