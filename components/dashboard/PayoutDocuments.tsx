"use client";

import { useState } from "react";
import { acknowledgeDocument } from "@/app/dashboard/actions/billing";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { PayoutDocumentRow } from "@/lib/dashboard";
import { euro, shortStamp } from "@/lib/format";

/**
 * The documents that came with each payment. The contract already makes them agreed, so the
 * button is a confirmation and not a gate — but one click is cheap and makes the record much
 * harder to argue with later.
 */
export function PayoutDocuments({ documents }: { documents: PayoutDocumentRow[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { run, message } = useServerAction(acknowledgeDocument, { successMessage: "Obrigado, ficou registado." });

  if (!documents.length) {
    return (
      <section className="box flex flex-col gap-2 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">Documentos</h2>
        <p className="m-0 text-sm text-muted">Ainda não há documentos. Recebes um com cada pagamento.</p>
      </section>
    );
  }

  return (
    <section className="box flex flex-col gap-3.5 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">Documentos</h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {documents.map((d) => {
          const acknowledged = d.acknowledged_at != null || done.has(d.id);
          return (
            <li key={d.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-line py-3 last:border-b-0">
              <a href={`/api/payments/document/${d.id}`} target="_blank" rel="noopener" className="num font-semibold">
                {d.number}
              </a>
              <span className="num text-sm text-muted">{euro(d.amount)}</span>
              {d.bookingRef && <span className="text-sm text-muted">· {d.bookingRef}</span>}
              <span className="text-sm text-muted">· {shortStamp(d.issued_at)}</span>
              {d.status === "void" ? (
                <span className="ml-auto text-sm text-muted">anulado</span>
              ) : acknowledged ? (
                <span className="ml-auto text-sm text-ok">confirmado</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-o ml-auto"
                  disabled={pendingId === d.id}
                  onClick={() => {
                    setPendingId(d.id);
                    setDone((s) => new Set(s).add(d.id));
                    run(d.id);
                  }}
                >
                  Confirmo
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <FormMessage message={message} />
    </section>
  );
}
