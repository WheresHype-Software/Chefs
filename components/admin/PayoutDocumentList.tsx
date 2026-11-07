"use client";

import { useState } from "react";
import { voidDocument } from "@/app/admin/pagamentos/actions";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { useServerAction } from "@/hooks/useServerAction";
import type { AdminDocumentRow } from "@/lib/admin/payments";
import { euro, shortStamp } from "@/lib/format";

/** Every document issued to a chef. Never edited — a wrong one is voided and another is issued. */
export function PayoutDocumentList({ documents }: { documents: AdminDocumentRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const { run, pending, message } = useServerAction(voidDocument, { successMessage: "Documento anulado." });

  return (
    <section id="documentos" className="box flex flex-col gap-3.5 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">Documentos de pagamento</h2>
      {!documents.length && <p className="m-0 text-sm text-muted">Ainda não foi emitido nenhum documento.</p>}

      <ul className="m-0 flex list-none flex-col p-0">
        {documents.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <a href={`/api/payments/document/${d.id}`} target="_blank" rel="noopener" className="num font-semibold">
                {d.number}
              </a>
              <span className="num text-sm">{euro(d.amount)}</span>
              <span className="text-sm text-muted">{d.chefName}</span>
              {d.bookingRef && <span className="text-sm text-muted">· {d.bookingRef}</span>}
              {/* O chef já não confirma documento a documento: o contrato que aceitou cobre-os todos. */}
              <span className="lab ml-auto text-muted">{d.status === "void" ? "anulado" : "emitido"}</span>
              <span className="text-[13px] text-muted">{shortStamp(d.issued_at)}</span>
              <a href={`/api/payments/document/${d.id}?download=1`} className="btn btn-sm btn-o no-underline" download>
                Descarregar
              </a>
            </div>
            {d.status === "issued" &&
              (open === d.id ? (
                <ReasonForm
                  label="Motivo para anular"
                  placeholder="Dados fiscais do chef estavam errados"
                  submitLabel="Anular documento"
                  danger
                  busy={pending}
                  message={message}
                  onSubmit={(reason) => run(d.id, reason)}
                />
              ) : (
                <button type="button" className="btn btn-sm btn-o !border-line-2 !text-danger self-start" onClick={() => setOpen(d.id)}>
                  Anular
                </button>
              ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
