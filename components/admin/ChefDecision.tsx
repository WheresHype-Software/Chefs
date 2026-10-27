"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderateReview, reviewChef } from "@/app/admin/actions";

const BADGES: [string, string][] = [
  ["identity", "Identidade verificada"],
  ["portfolio", "Portefólio verificado"],
  ["certified", "Certificado"],
  ["founder", "Chef fundador"],
];

export function ChefDecision({ chefId, badges: initial }: { chefId: string; badges: string[] }) {
  const router = useRouter();
  const [badges, setBadges] = useState(initial.length ? initial : ["identity", "portfolio"]);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function decide(d: "approved" | "rejected" | "suspended") {
    if (d !== "approved" && !note.trim()) return setMsg("Escreva o motivo: o chef recebe-o por email.");
    start(async () => {
      const r = await reviewChef(chefId, d, note, badges);
      setMsg(r.ok ? "Feito." : r.error ?? "Erro");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {BADGES.map(([k, label]) => (
          <button key={k} type="button" className="chip" aria-pressed={badges.includes(k)} onClick={() => setBadges((b) => (b.includes(k) ? b.filter((x) => x !== k) : [...b, k]))}>
            {label}
          </button>
        ))}
      </div>
      <label className="field lab">
        Nota para o chef (obrigatória para recusar ou pedir alterações)
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-sm" disabled={pending} onClick={() => decide("approved")}>
          Aprovar
        </button>
        <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => decide("rejected")}>
          Pedir alterações
        </button>
        <button type="button" className="btn btn-sm btn-o !border-line-2 !text-danger" disabled={pending} onClick={() => decide("suspended")}>
          Suspender
        </button>
      </div>
      {msg && <p className="m-0 text-sm text-muted">{msg}</p>}
    </div>
  );
}

export function ReviewModeration({ reviewId, reportId }: { reviewId: string; reportId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (a: "keep" | "hide" | "delete") =>
    start(async () => {
      await moderateReview(reviewId, reportId, a);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => run("keep")}>
        Manter
      </button>
      <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => run("hide")}>
        Esconder
      </button>
      <button type="button" className="btn btn-sm btn-o !border-line-2 !text-danger" disabled={pending} onClick={() => confirm("Apagar a avaliação?") && run("delete")}>
        Apagar
      </button>
    </div>
  );
}
