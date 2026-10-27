"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChefDecision, type Decision } from "@/components/admin/ChefDecision";

const DONE: Record<Decision, string> = {
  approved: "aprovado. O perfil já está público e o chef recebeu um email.",
  rejected: "recebeu o pedido de alterações por email.",
  suspended: "foi suspenso. O perfil deixou de estar visível.",
};

type Props = { chefId: string; chefName: string; slug: string; badges: string[]; children: ReactNode };

/** A chef under review; once decided, it folds into a one-line confirmation so the next chef is in view. */
export function DecisionCard({ chefId, chefName, slug, badges, children }: Props) {
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

  return (
    <article className="box flex flex-col gap-6 p-4 md:p-6">
      {children}
      <div className="border-t border-line pt-5">
        <ChefDecision chefId={chefId} chefName={chefName} badges={badges} onDone={setDone} />
      </div>
    </article>
  );
}
