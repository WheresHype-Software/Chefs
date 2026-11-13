"use client";

import { Link } from "@/lib/i18n/navigation";
import { useState, type ReactNode } from "react";
import { ChefDecision, type Decision } from "@/components/admin/ChefDecision";

const DONE: Record<Decision, string> = {
  approved: "aprovado. O perfil já está público e o chef recebeu um email.",
  rejected: "recebeu o pedido de alterações por email.",
  suspended: "foi suspenso. O perfil deixou de estar visível.",
};

type Props = {
  chefId: string;
  chefName: string;
  slug: string;
  badges: string[];
  /** The one-line summary shown while the card is closed (and as its header when open). */
  summary: ReactNode;
  open: boolean;
  onToggle: () => void;
  onDecided?: (decision: Decision) => void;
  children: ReactNode;
};

/**
 * A chef under review: a summary row that opens into the full application and the decision.
 * Once decided it folds into a one-line confirmation, and the queue opens the next one.
 */
export function DecisionCard({ chefId, chefName, slug, badges, summary, open, onToggle, onDecided, children }: Props) {
  const [done, setDone] = useState<Decision | null>(null);

  if (done) {
    return (
      <article role="status" className="box flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="text-[15px]">
          <strong className="font-semibold">{chefName}</strong> {DONE[done]}
        </span>
        {done === "approved" && (
          <Link href={`/chef/${slug}`} target="_blank" className="text-sm font-semibold">
            Ver perfil público ↗
          </Link>
        )}
      </article>
    );
  }

  const bodyId = `candidatura-${chefId}`;
  return (
    <article id={`chef-${chefId}`} className={`box scroll-mt-28 overflow-hidden ${open ? "ring-2 ring-cobalt/30" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-4 text-left font-[inherit] text-ink hover:bg-paper md:px-6"
      >
        <span className="min-w-0 flex-1">{summary}</span>
        <span aria-hidden="true" className={`shrink-0 text-xl text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>
      {open && (
        <div id={bodyId} className="flex flex-col gap-6 border-t border-line p-4 md:p-6">
          {children}
          <div className="border-t border-line pt-5">
            <ChefDecision
              chefId={chefId}
              chefName={chefName}
              badges={badges}
              onDone={(d) => {
                setDone(d);
                onDecided?.(d);
              }}
            />
          </div>
        </div>
      )}
    </article>
  );
}
