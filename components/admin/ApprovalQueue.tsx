"use client";

import { useState } from "react";
import { approveChefs } from "@/app/admin/actions";
import { PendingChefCard, type PendingChef } from "@/components/admin/PendingChefCard";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { readiness } from "@/lib/admin/readiness";

/**
 * Applications one after another: complete ones first (the page sorts them), one open at a time.
 * Deciding folds the card and opens the next; complete profiles can be approved together.
 */
export function ApprovalQueue({ chefs }: { chefs: PendingChef[] }) {
  const [openId, setOpenId] = useState<string | null>(chefs[0]?.id ?? null);
  const [decided, setDecided] = useState<Set<string>>(new Set());
  const bulk = useServerAction(approveChefs);
  const ready = chefs.filter((c) => !decided.has(c.id) && readiness(c).ready);

  function decide(id: string) {
    const nowDecided = new Set(decided).add(id);
    setDecided(nowDecided);
    const next = chefs.find((c) => !nowDecided.has(c.id));
    setOpenId(next?.id ?? null);
    if (next)
      requestAnimationFrame(() => document.getElementById(`chef-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function approveReady() {
    const names = ready.map((c) => `• ${c.display_name}`).join("\n");
    if (
      !window.confirm(
        `Aprovar e publicar ${ready.length} perfis completos?\n\n${names}\n\nRecebem os selos de identidade e portefólio e um email. O título de Chef continua a precisar de verificação.`,
      )
    )
      return;
    bulk.run(ready.map((c) => c.id));
  }

  if (chefs.length === 0) return <p className="m-0 text-muted">Nenhum chef à espera de aprovação.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted" aria-live="polite">
          {decided.size} de {chefs.length} decididos · {chefs.filter((c) => readiness(c).ready).length} completos
        </span>
        {ready.length > 1 && (
          <button type="button" className="btn btn-sm btn-o" disabled={bulk.pending} onClick={approveReady}>
            {bulk.pending ? "A aprovar…" : `Aprovar os ${ready.length} completos`}
          </button>
        )}
      </div>
      <FormMessage message={bulk.message} />
      {chefs.map((c) => (
        <PendingChefCard
          key={c.id}
          chef={c}
          open={openId === c.id}
          onToggle={() => setOpenId((id) => (id === c.id ? null : c.id))}
          onDecided={() => decide(c.id)}
        />
      ))}
    </div>
  );
}
