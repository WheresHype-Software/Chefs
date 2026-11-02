"use client";

import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { submitReview } from "@/lib/bookings";

const CATEGORIES = [
  ["food", "Comida"],
  ["presentation", "Apresentação"],
  ["punctuality", "Pontualidade"],
  ["communication", "Comunicação"],
  ["value", "Qualidade/preço"],
] as const;

type Category = (typeof CATEGORIES)[number][0];
type Scores = Record<Category, number>;

/** What each star means, said as the person picks it. */
const MEANING = ["", "Mau", "Fraco", "Razoável", "Muito bom", "Excelente"];

const allAt = (n: number): Scores => ({ food: n, presentation: n, punctuality: n, communication: n, value: n });

function Stars({
  label,
  value,
  onChange,
  size = "sm",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  size?: "sm" | "lg";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} de 5: ${MEANING[n]}`}
          onClick={() => onChange(n)}
          className={`ctl ${size === "lg" ? "!h-12 !w-12 !text-2xl" : "!h-9 !w-9 !text-base"} ${value >= n ? "!border-cobalt !bg-cobalt !text-white" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/**
 * One tap to review: the overall stars are enough to publish. The categories start at the same
 * score and can be fine-tuned if the person wants; the comment is optional.
 */
export function ReviewForm({ id, chef }: { id: string; chef: string }) {
  const [overall, setOverall] = useState(0);
  const [scores, setScores] = useState<Scores>(allAt(0));
  const [detailed, setDetailed] = useState(false);
  const [comment, setComment] = useState("");
  const [allowShowcase, setAllowShowcase] = useState(true);
  const [done, setDone] = useState(false);
  const { run, pending, message } = useServerAction(submitReview, { onSuccess: () => setDone(true) });

  function rate(n: number) {
    setOverall(n);
    setScores(allAt(n));
  }

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
        if (overall) run(id, { scores, comment, allowShowcase });
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="d m-0 text-[28px]">Como correu com {chef}?</h2>
        <p className="m-0 text-sm text-muted">Basta escolher as estrelas. Tem 14 dias depois do serviço para avaliar.</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Stars label="Avaliação geral" value={overall} onChange={rate} size="lg" />
        <span className="text-[17px] font-semibold" aria-live="polite">
          {MEANING[overall]}
        </span>
      </div>

      {overall > 0 && (
        <>
          <div className="flex flex-col">
            <button
              type="button"
              aria-expanded={detailed}
              onClick={() => setDetailed((d) => !d)}
              className="cursor-pointer self-start border-0 bg-transparent p-0 text-[15px] font-semibold text-cobalt underline"
            >
              {detailed ? "Esconder categorias" : "Avaliar por categoria (opcional)"}
            </button>
            {detailed &&
              CATEGORIES.map(([key, label]) => (
                <div key={key} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                  <span className="text-[15px]">{label}</span>
                  <Stars label={label} value={scores[key]} onChange={(n) => setScores((s) => ({ ...s, [key]: n }))} />
                </div>
              ))}
          </div>

          <label className="field lab">
            Comentário (opcional)
            <textarea
              rows={4}
              maxLength={3000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que pediu? O que mais gostou? Ajuda quem vem a seguir."
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={allowShowcase}
              onChange={(e) => setAllowShowcase(e.target.checked)}
              className="mt-1 accent-ink"
            />
            Autorizo que o resumo desta reserva apareça no perfil do chef.
          </label>
        </>
      )}

      <FormMessage message={message} />
      <button type="submit" className="btn self-start" disabled={!overall || pending}>
        {pending ? "A publicar…" : "Publicar avaliação"}
      </button>
    </form>
  );
}
