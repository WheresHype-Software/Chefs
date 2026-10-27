"use client";

import { useState } from "react";
import { moderateReview, reviewChef } from "@/app/admin/actions";
import { Chip } from "@/components/ui/Chip";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { useToggleList } from "@/hooks/useToggleList";

export type Decision = "approved" | "rejected" | "suspended";

const BADGES: [string, string, string][] = [
  ["identity", "Identidade verificada", "A pessoa da fotografia é quem diz ser."],
  ["portfolio", "Portefólio verificado", "Os pratos são mesmo feitos por este chef."],
  ["certified", "Certificado", "Viu um certificado válido (ex.: HACCP)."],
  ["founder", "Chef fundador", "Entre os primeiros chefs do Ao Lume."],
];

/** Ready-made reasons for "Pedir alterações"; each becomes a line in the email. */
const REASONS = [
  "A fotografia de perfil não mostra a sua cara com clareza.",
  "As fotografias dos pratos estão escuras ou pouco nítidas.",
  "Precisamos de pelo menos três fotografias de pratos feitos por si.",
  "O Instagram ou o site não confirmam que os pratos são seus.",
  "Escreva um pouco mais sobre si e sobre a sua cozinha.",
  "Crie pelo menos uma oferta com preço, para os clientes poderem reservar.",
];

const TABS: [Decision, string][] = [
  ["approved", "Aprovar"],
  ["rejected", "Pedir alterações"],
  ["suspended", "Suspender"],
];

const SUBMIT: Record<Decision, string> = {
  approved: "Aprovar e publicar",
  rejected: "Enviar pedido de alterações",
  suspended: "Suspender perfil",
};

type Props = { chefId: string; chefName: string; badges: string[]; onDone: (decision: Decision) => void };

/** Approve, ask for changes or suspend a chef: badges, reasons, the message the chef gets, and one clear action. */
export function ChefDecision({ chefId, chefName, badges: initial, onDone }: Props) {
  const [decision, setDecision] = useState<Decision>("approved");
  const badges = useToggleList(initial.length ? initial : ["identity", "portfolio"]);
  const reasons = useToggleList<string>([]);
  const [note, setNote] = useState("");
  const { run, pending, message, setMessage } = useServerAction(reviewChef, { refresh: false, onSuccess: () => onDone(decision) });

  const reasonLines = decision === "rejected" ? reasons.items.map((r) => `- ${r}`) : [];
  const text = [...reasonLines, note.trim()].filter(Boolean).join("\n");
  const needsText = decision !== "approved";

  function submit() {
    if (needsText && !text) {
      setMessage({
        ok: false,
        text: decision === "rejected" ? "Escolha um motivo ou escreva o que falta." : "Escreva o motivo da suspensão.",
      });
      return;
    }
    if (decision === "suspended" && !window.confirm(`Suspender ${chefName}? O perfil deixa de aparecer aos clientes.`)) return;
    // Only approval changes the badges; other decisions keep what the chef already had.
    run(chefId, decision, text, decision === "approved" ? badges.items : initial);
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Decisão" className="grid grid-cols-3 gap-1 rounded-[3px] border border-line-2 p-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={decision === key}
            onClick={() => {
              setDecision(key);
              setMessage(null);
            }}
            className={`min-h-10 cursor-pointer rounded-[2px] border-0 px-2 font-[inherit] text-[14px] font-semibold transition-colors md:text-[15px] ${
              decision === key
                ? key === "suspended"
                  ? "bg-danger text-white"
                  : "bg-cobalt text-white"
                : "bg-transparent text-ink hover:bg-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {decision === "approved" && (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="lab mb-2.5 p-0">Selos no perfil público</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BADGES.map(([key, label, hint]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-[3px] border px-3.5 py-3 transition-colors ${
                  badges.has(key) ? "border-cobalt bg-cobalt-soft" : "border-line-2 bg-white hover:border-line-3"
                }`}
              >
                <input
                  type="checkbox"
                  checked={badges.has(key)}
                  onChange={() => badges.toggle(key)}
                  className="mt-1 accent-[var(--color-cobalt)]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{label}</span>
                  <span className="text-[13px] text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {decision === "rejected" && (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="lab mb-2.5 p-0">O que falta (escolha um ou mais)</legend>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <Chip
                key={r}
                pressed={reasons.has(r)}
                onClick={() => reasons.toggle(r)}
                className="!h-auto !min-h-10 !whitespace-normal py-2 text-left"
              >
                {r}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      {decision === "suspended" && (
        <p className="m-0 rounded-[3px] border border-danger/30 bg-[#fbeeec] px-4 py-3 text-sm text-danger">
          O perfil deixa de aparecer nas pesquisas e a página pública fica indisponível. Use para casos graves.
        </p>
      )}

      <label className="field lab">
        {decision === "approved" ? "Mensagem para o chef (opcional)" : decision === "rejected" ? "Mais alguma coisa? (opcional)" : "Motivo"}
        <textarea rows={3} maxLength={800} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {text && (
        <div className="flex flex-col gap-1.5">
          <span className="lab text-muted">O chef recebe por email</span>
          <p className="m-0 whitespace-pre-line rounded-[3px] bg-paper px-4 py-3 text-sm text-ink-3">{text}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`btn ${decision === "suspended" ? "!border-danger !bg-danger" : ""}`}
          disabled={pending}
          onClick={submit}
        >
          {pending ? "A guardar…" : SUBMIT[decision]}
        </button>
        <FormMessage message={message} />
      </div>
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
