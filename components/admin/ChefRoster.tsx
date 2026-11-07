"use client";

import Link from "next/link";
import { useState } from "react";
import { setChefVisibility } from "@/app/admin/actions";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { chefTitle } from "@/lib/format";

export type RosterChef = {
  id: string;
  /** Null nos perfis que a equipa semeou: não há ninguém a quem perguntar. */
  profile_id: string | null;
  display_name: string;
  slug: string;
  status: "draft" | "pending" | "approved" | "rejected" | "suspended";
  area_name: string | null;
  badges: string[];
  deposit_percent: number | null;
  rating_avg: number | null;
  review_count: number;
  completed_bookings: number;
  photos: number;
  activeOffers: number;
  /** Set when payments are on; a chef below this cannot accept a booking. */
  minDeposit: number;
};

const STATUS: Record<string, string> = {
  approved: "No site",
  suspended: "Escondido",
  rejected: "Recusado",
  draft: "Rascunho",
  pending: "Por aprovar",
};

/** What is missing before this profile is worth showing to a visitor. */
function gaps(c: RosterChef): string[] {
  const out: string[] = [];
  if (!c.photos) out.push("sem fotografias");
  if (!c.activeOffers) out.push("sem ofertas activas");
  if (!c.area_name) out.push("sem zona");
  if (c.minDeposit > 0 && (c.deposit_percent ?? 0) > 0 && (c.deposit_percent ?? 0) < c.minDeposit) {
    out.push(`sinal de ${c.deposit_percent}% abaixo do mínimo (${c.minDeposit}%)`);
  }
  return out;
}

/**
 * The chefs already decided on — the ones the approval queue no longer shows.
 *
 * Without this, taking a chef off the site meant going into the database by hand, which is both
 * slower than the problem (a complaint, a profile gone wrong) and leaves no trace anyone can read.
 * Hiding asks for a reason, and the chef is told what it was.
 */
export function ChefRoster({ chefs }: { chefs: RosterChef[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const { run, pending, message } = useServerAction(setChefVisibility, {
    successMessage: "Guardado. O chef foi avisado por email.",
    onSuccess: () => setOpen(null),
  });

  if (!chefs.length) return <p className="m-0 text-muted">Ainda não há chefs decididos.</p>;

  return (
    <>
      <FormMessage message={message} />
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {chefs.map((c) => {
          const missing = gaps(c);
          const live = c.status === "approved";
          // Um rascunho de alguém é um perfil a meio, não um perfil à espera de decisão: a pessoa
          // ainda não carregou em «enviar para revisão». Publicá-lo seria pô-lo no site por cima
          // dela, muitas vezes sem ofertas e com uma fotografia. Os rascunhos sem dono são outra
          // coisa: foram semeados por nós e é assim que vão para o ar.
          const unsubmitted = c.status === "draft" && c.profile_id !== null;
          return (
            <li key={c.id} className="box flex flex-col gap-2.5 p-5">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-semibold">
                  {chefTitle(c.badges)} {c.display_name}
                </span>
                {live ? (
                  <Link href={`/chef/${c.slug}`} target="_blank" className="text-sm">
                    /chef/{c.slug}
                  </Link>
                ) : (
                  <span className="text-sm text-muted">/chef/{c.slug}</span>
                )}
                <span className="text-sm text-muted">{c.area_name ?? "—"}</span>
                <span className={`lab ml-auto ${live ? "text-ok" : "text-muted"}`}>{STATUS[c.status] ?? c.status}</span>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
                <span>{c.photos} fotografias</span>
                <span>
                  {c.activeOffers} oferta{c.activeOffers === 1 ? "" : "s"}
                </span>
                <span>{c.completed_bookings} reservas concluídas</span>
                <span>{c.review_count ? `★ ${Number(c.rating_avg ?? 0).toFixed(1)} (${c.review_count})` : "sem avaliações"}</span>
                <span>sinal {c.deposit_percent ?? 0}%</span>
              </div>

              {missing.length > 0 && (
                <p className="m-0 border-l-2 border-line-2 pl-3 text-sm text-muted">
                  {live ? "Está no site mas" : "Antes de publicar:"} {missing.join(" · ")}.
                </p>
              )}

              {unsubmitted ? (
                <p className="m-0 text-sm text-muted">
                  Ainda não foi enviado para revisão. Quando {c.display_name.split(" ")[0]} terminar o perfil e o enviar, aparece em «Perfis
                  por aprovar».
                </p>
              ) : open === c.id ? (
                <ReasonForm
                  label={live ? "Motivo para esconder" : "Nota para o chef (opcional)"}
                  placeholder={live ? "Perfil incompleto · a pedido do chef · denúncia" : "Está tudo bem, voltou ao site"}
                  submitLabel={live ? "Esconder do site" : "Publicar"}
                  danger={live}
                  optional={!live}
                  busy={pending}
                  onSubmit={(note) => run(c.id, live, note)}
                />
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    className={`btn btn-sm ${live ? "btn-o !border-line-2 !text-danger" : ""}`}
                    onClick={() => setOpen(c.id)}
                  >
                    {live ? "Esconder do site" : "Publicar no site"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
