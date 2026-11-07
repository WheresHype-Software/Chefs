"use client";

import { useState } from "react";
import { cancelBatch, confirmBatchPaid, createBatch, downloadBatch } from "@/app/admin/pagamentos/actions";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { AdminBatchRow, AdminPayoutRow } from "@/lib/admin/payments";
import { callAction } from "@/lib/call-action";
import { euro, shortStamp } from "@/lib/format";

const HOLD_REASON: Record<string, string> = {
  chef_payouts_blocked: "pagamentos bloqueados por nós",
};

/**
 * Porque é que este ainda não entra num lote. A base de dados diz sim ou não; isto diz o que
 * falta, que é a pergunta que a pessoa à frente do ecrã tem de facto.
 */
function whyWaiting(p: AdminPayoutRow): string {
  if (p.chef?.payouts_blocked) return "pagamentos bloqueados por nós";
  if (p.hold_reason) return HOLD_REASON[p.hold_reason] ?? p.hold_reason;
  if (new Date(p.due_at) > new Date()) return `em retenção até ${shortStamp(p.due_at)}`;
  return "falta a faturação, o contrato ou a verificação do IBAN";
}

const STATUS: Record<string, string> = {
  draft: "Por exportar",
  exported: "Ficheiro gerado · por pagar no banco",
  paid: "Pago",
  cancelled: "Anulado",
};

function download(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Where chefs actually get paid.
 *
 * EuPago has no way to send money to a chef's IBAN, so this produces a SEPA file and a CSV for a
 * person to upload at the bank, and only records the payment once that person says the transfers
 * left. The documents for the chefs are issued at that moment, which is the first time we can
 * honestly put a transfer date on them.
 */
export function PayoutBatches({
  batches,
  duePayouts,
  readyPayoutIds,
  owed,
}: {
  batches: AdminBatchRow[];
  duePayouts: AdminPayoutRow[];
  readyPayoutIds: string[];
  owed: number;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [openPaid, setOpenPaid] = useState<string | null>(null);
  const [openCancel, setOpenCancel] = useState<string | null>(null);

  const create = useServerAction(createBatch, { successMessage: "Lote criado." });
  const paid = useServerAction(confirmBatchPaid, { successMessage: "Lote marcado como pago e documentos emitidos." });
  const cancelled = useServerAction(cancelBatch, { successMessage: "Lote anulado." });

  // A lista vem da base de dados, da mesma função que o lote usa. Contar aqui por `status`
  // deixava o botão prometer pagamentos que o build_payout_batch ia recusar.
  const readyIds = new Set(readyPayoutIds);
  const ready = duePayouts.filter((p) => readyIds.has(p.id));
  const waiting = duePayouts.filter((p) => !readyIds.has(p.id));

  async function getFiles(batch: AdminBatchRow) {
    setBusy(true);
    setNote(null);
    const result = await callAction(() => downloadBatch(batch.id));
    setBusy(false);
    if (!result.ok) {
      setNote(result.error);
      return;
    }
    download(`${result.reference}.xml`, result.xml, "application/xml");
    download(`${result.reference}.csv`, result.csv, "text/csv");
    if (result.skipped.length) setNote(`Ficaram de fora, sem dados bancários legíveis: ${result.skipped.join(", ")}`);
  }

  return (
    <section id="lotes" className="box flex flex-col gap-4 p-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="d m-0 text-[22px] font-normal">Pagar aos chefs</h2>
        <span className="num text-sm text-muted">{euro(owed)} por pagar no total</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className="btn btn-sm" disabled={create.pending || !ready.length} onClick={() => create.run()}>
          {create.pending ? "A juntar…" : `Criar lote com ${ready.length} pagamento${ready.length === 1 ? "" : "s"}`}
        </button>
        <FormMessage message={create.message} />
      </div>
      {!ready.length && (
        <p className="m-0 text-sm text-muted">
          {waiting.length
            ? "Nada pronto ainda. Em baixo fica o que falta a cada um."
            : "Nada por pagar: todos os serviços concluídos já foram liquidados."}
        </p>
      )}

      {waiting.length > 0 && (
        <div className="flex flex-col gap-1.5 border-l-2 border-line-2 pl-3">
          <span className="lab text-muted">À espera ({waiting.length})</span>
          {waiting.map((p) => (
            <span key={p.id} className="text-sm">
              {euro(p.amount)} · {p.chef?.display_name} · {whyWaiting(p)}
            </span>
          ))}
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {batches.map((b) => (
          <li key={b.id} className="flex flex-col gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="num font-semibold">{b.reference}</span>
              <span className="num">{euro(b.total)}</span>
              <span className="text-sm text-muted">
                {b.chef_count} chef{b.chef_count === 1 ? "" : "s"}
              </span>
              <span className="lab ml-auto text-muted">{STATUS[b.status] ?? b.status}</span>
              <span className="text-[13px] text-muted">{shortStamp(b.paid_at ?? b.created_at)}</span>
            </div>
            {b.bank_reference && <span className="text-sm text-muted">Referência do banco: {b.bank_reference}</span>}

            {(b.status === "draft" || b.status === "exported") && (
              <div className="flex flex-wrap gap-2.5">
                <button type="button" className="btn btn-sm btn-o" disabled={busy} onClick={() => void getFiles(b)}>
                  {busy ? "A gerar…" : "Descarregar SEPA + CSV"}
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setOpenPaid(openPaid === b.id ? null : b.id)}>
                  Já paguei no banco
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-o !border-line-2 !text-danger"
                  onClick={() => setOpenCancel(openCancel === b.id ? null : b.id)}
                >
                  Anular lote
                </button>
              </div>
            )}

            {openPaid === b.id && (
              <ReasonForm
                label="Referência da transferência no banco"
                placeholder="SEPA-2026-11-06"
                submitLabel="Confirmar pagamento e emitir documentos"
                busy={paid.pending}
                message={paid.message}
                onSubmit={(bankReference) => paid.run({ batchId: b.id, bankReference })}
              />
            )}
            {openCancel === b.id && (
              <ReasonForm
                label="Motivo para anular"
                submitLabel="Anular e devolver os pagamentos à fila"
                danger
                busy={cancelled.pending}
                message={cancelled.message}
                onSubmit={(reason) => cancelled.run(b.id, reason)}
              />
            )}
          </li>
        ))}
      </ul>
      {note && <p className="m-0 text-sm text-muted">{note}</p>}
    </section>
  );
}
