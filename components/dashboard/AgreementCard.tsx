"use client";

import { useState } from "react";
import { acceptAgreement } from "@/app/dashboard/actions/billing";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";

type Props = {
  text: string;
  version: number;
  acceptedVersion: number | null;
  highlights: readonly string[];
  commissionPercent: number;
  commissionMin: number;
  payoutHoldHours: number;
};

/**
 * The contract. Accepting it is what lets us collect the signal in the chef's name and issue the
 * payment documents without a signature on each one, so the full text is on the page — not behind
 * a link — and the checkbox is never pre-ticked.
 */
export function AgreementCard({ text, version, acceptedVersion, highlights, commissionPercent, commissionMin, payoutHoldHours }: Props) {
  const [checked, setChecked] = useState(false);
  const { run, pending, message } = useServerAction(acceptAgreement, { successMessage: "Contrato aceite. Obrigado." });
  const accepted = acceptedVersion != null && acceptedVersion >= version;
  const outdated = acceptedVersion != null && acceptedVersion < version;
  const pct = String(commissionPercent).replace(".", ",");
  const min = String(commissionMin).replace(".", ",");

  return (
    <section className="box flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="d m-0 text-2xl font-normal">Contrato</h2>
        <span className="lab text-muted">
          versão {version}
          {accepted && " · aceite"}
        </span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        {highlights.map((h) => (
          <li key={h} className="flex gap-2.5">
            <span aria-hidden="true" className="text-muted">
              —
            </span>
            <span>{h}</span>
          </li>
        ))}
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="text-muted">
            —
          </span>
          <span>
            Comissão em vigor: <strong className="num">{pct}%</strong> do valor da reserva, com um mínimo de{" "}
            <strong className="num">{min} €</strong>. Pagamos-te {payoutHoldHours} horas depois do serviço concluído.
          </span>
        </li>
      </ul>

      {outdated && (
        <p className="m-0 border-l-2 border-line-2 pl-3 text-sm">
          O contrato mudou desde que o aceitaste (tinhas a versão {acceptedVersion}). Lê e aceita a nova versão para continuarmos a
          pagar-te.
        </p>
      )}

      <details className="border-t border-line pt-4">
        <summary className="lab cursor-pointer text-muted">Ler o contrato completo</summary>
        <pre className="m-0 mt-3 max-h-[380px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-3">{text}</pre>
      </details>

      {!accepted && (
        <form
          className="flex flex-col gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
            <span>
              Li e aceito o contrato de intermediação de pagamentos, incluindo a autorização para o Ao Lume receber o sinal em meu nome,
              descontar a comissão e emitir os documentos de pagamento com os meus dados fiscais.
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn" disabled={pending || !checked}>
              {pending ? "A registar…" : "Aceitar contrato"}
            </button>
            <FormMessage message={message} />
          </div>
        </form>
      )}
      {accepted && <FormMessage message={message} />}
    </section>
  );
}
