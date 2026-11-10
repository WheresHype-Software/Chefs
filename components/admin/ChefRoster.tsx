"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { setChefVisibility } from "@/app/admin/actions";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { Chip } from "@/components/ui/Chip";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { chefTitle, initials, shortStamp, toneFor } from "@/lib/format";

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
  created_at: string;
  email: string | null;
  /** Public photos only: the selfie never comes this far. */
  portrait: string | null;
  gallery: string[];
  photos: number;
  activeOffers: number;
  /** Set when payments are on; a chef below this cannot accept a booking. */
  minDeposit: number;
};

const STATUS: Record<RosterChef["status"], { label: string; tone: string }> = {
  approved: { label: "No site", tone: "bg-[#e3f1e9] text-ok" },
  suspended: { label: "Escondido", tone: "bg-[#f8e4e1] text-danger" },
  rejected: { label: "Recusado", tone: "bg-paper text-muted" },
  draft: { label: "Rascunho", tone: "bg-yolk-soft text-ink-3" },
  pending: { label: "Por aprovar", tone: "bg-cobalt-soft text-cobalt" },
};

type Filter = "all" | "approved" | "suspended" | "draft" | "rejected" | "attention";
type Sort = "name" | "recent" | "bookings";

const FILTERS: [Filter, string][] = [
  ["all", "Todos"],
  ["approved", "No site"],
  ["attention", "Precisam de atenção"],
  ["suspended", "Escondidos"],
  ["draft", "Rascunhos"],
  ["rejected", "Recusados"],
];

/** What is missing before this profile is worth showing to a visitor. */
function gaps(c: RosterChef): string[] {
  const out: string[] = [];
  if (!c.portrait) out.push("sem fotografia de perfil");
  if (c.gallery.length < 3)
    out.push(c.gallery.length ? `só ${c.gallery.length} foto${c.gallery.length === 1 ? "" : "s"} de pratos` : "sem fotos de pratos");
  if (!c.activeOffers) out.push("sem ofertas ativas");
  if (!c.area_name) out.push("sem zona");
  if (c.minDeposit > 0 && (c.deposit_percent ?? 0) > 0 && (c.deposit_percent ?? 0) < c.minDeposit) {
    out.push(`sinal de ${c.deposit_percent}% abaixo do mínimo (${c.minDeposit}%)`);
  }
  return out;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Face({ chef, size }: { chef: RosterChef; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] font-bold text-cobalt-deep"
      style={{ width: size, height: size, background: toneFor(chef.id) }}
    >
      {chef.portrait ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chef.portrait} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        initials(chef.display_name)
      )}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="num text-[17px] font-semibold leading-tight text-ink">{value}</span>
      <span className="text-[12px] text-muted">{label}</span>
    </div>
  );
}

/**
 * The chefs already decided on — the ones the approval queue no longer shows.
 *
 * Each card leads with the chef's face and dishes, so the team recognises a profile at a glance
 * instead of reading names. Search and filters find one chef among many; "Precisam de atenção"
 * gathers the live profiles with something missing. Hiding asks for a reason, and the chef is
 * told what it was.
 */
export function ChefRoster({ chefs }: { chefs: RosterChef[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const { run, pending, message } = useServerAction(setChefVisibility, {
    successMessage: "Guardado. O chef foi avisado por email.",
    onSuccess: () => setOpen(null),
  });

  const counts = useMemo(() => {
    const by = (f: Filter) =>
      f === "all"
        ? chefs.length
        : f === "attention"
          ? chefs.filter((c) => c.status === "approved" && gaps(c).length > 0).length
          : chefs.filter((c) => c.status === f).length;
    return Object.fromEntries(FILTERS.map(([f]) => [f, by(f)])) as Record<Filter, number>;
  }, [chefs]);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    const list = chefs.filter((c) => {
      if (filter === "attention" ? !(c.status === "approved" && gaps(c).length > 0) : filter !== "all" && c.status !== filter) {
        return false;
      }
      if (!q) return true;
      return [c.display_name, c.slug, c.area_name ?? "", c.email ?? ""].some((v) => fold(v).includes(q));
    });
    return [...list].sort((a, b) =>
      sort === "recent"
        ? b.created_at.localeCompare(a.created_at)
        : sort === "bookings"
          ? b.completed_bookings - a.completed_bookings
          : a.display_name.localeCompare(b.display_name, "pt"),
    );
  }, [chefs, query, filter, sort]);

  if (!chefs.length) return <p className="m-0 text-muted">Ainda não há chefs decididos.</p>;

  return (
    <section className="flex flex-col gap-4">
      <div className="box flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="min-w-[220px] flex-1">
            <span className="sr-only">Procurar chef</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar por nome, zona, endereço ou email"
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Ordenar
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="name">Nome</option>
              <option value="recent">Mais recentes</option>
              <option value="bookings">Mais reservas</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {FILTERS.filter(([f]) => f === "all" || counts[f] > 0).map(([f, label]) => (
            <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)} className="!min-h-9 text-sm">
              {label} · {counts[f]}
            </Chip>
          ))}
        </div>
      </div>

      <FormMessage message={message} />
      {!shown.length && <p className="m-0 text-sm text-muted">Nenhum chef corresponde a esta pesquisa.</p>}

      <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
        {shown.map((c) => {
          const missing = gaps(c);
          const live = c.status === "approved";
          const status = STATUS[c.status];
          // Um rascunho de alguém é um perfil a meio, não um perfil à espera de decisão: a pessoa
          // ainda não carregou em «enviar para revisão». Publicá-lo seria pô-lo no site por cima
          // dela, muitas vezes sem ofertas e com uma fotografia. Os rascunhos sem dono são outra
          // coisa: foram semeados por nós e é assim que vão para o ar.
          const unsubmitted = c.status === "draft" && c.profile_id !== null;
          const extra = c.gallery.length - 4;
          return (
            <li key={c.id} className="box flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 p-5 pb-4">
                <Face chef={c} size={64} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="m-0 truncate text-[18px] font-bold leading-tight">
                      {chefTitle(c.badges)} {c.display_name}
                    </h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${status.tone}`}>{status.label}</span>
                  </div>
                  <span className="truncate text-[13px] text-muted">
                    {c.area_name ?? "sem zona"} · desde {shortStamp(c.created_at)}
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-[13px]">
                    {live ? (
                      <Link href={`/chef/${c.slug}`} target="_blank">
                        /chef/{c.slug}
                      </Link>
                    ) : (
                      <span className="text-muted">/chef/{c.slug}</span>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="truncate text-muted">
                        {c.email}
                      </a>
                    )}
                  </span>
                </div>
              </div>

              {c.gallery.length > 0 && (
                <div className="flex gap-2 px-5 pb-4">
                  {c.gallery.slice(0, 4).map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" loading="lazy" className="h-16 w-16 rounded-[8px] bg-paper object-cover" />
                  ))}
                  {extra > 0 && (
                    <span className="flex h-16 w-16 items-center justify-center rounded-[8px] bg-paper text-sm font-semibold text-muted">
                      +{extra}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-3 border-t border-line px-5 py-3.5">
                <Stat label={c.activeOffers === 1 ? "oferta" : "ofertas"} value={String(c.activeOffers)} />
                <Stat label="reservas" value={String(c.completed_bookings)} />
                <Stat
                  label={c.review_count ? `${c.review_count} avaliações` : "sem avaliações"}
                  value={c.review_count ? `★ ${Number(c.rating_avg ?? 0).toFixed(1)}` : "—"}
                />
                <Stat label="sinal" value={`${c.deposit_percent ?? 0}%`} />
              </div>

              {missing.length > 0 && (
                <p className="m-0 border-t border-line bg-yolk-soft px-5 py-2.5 text-[13px] text-ink-3">
                  {live ? "No site, mas" : "Antes de publicar:"} {missing.join(" · ")}.
                </p>
              )}

              <div className="mt-auto flex flex-col gap-3 border-t border-line px-5 py-3.5">
                {unsubmitted ? (
                  <p className="m-0 text-[13px] text-muted">
                    Ainda não foi enviado para revisão. Quando {c.display_name.split(" ")[0]} o enviar, aparece em «Perfis por aprovar».
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
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {live && (
                    <Link href={`/chef/${c.slug}`} target="_blank" className="btn btn-sm btn-o no-underline">
                      Ver no site
                    </Link>
                  )}
                  {c.profile_id && (
                    <Link href={`/admin/chefs/contratos#conta-${c.profile_id}`} className="btn btn-sm btn-o no-underline">
                      Contrato
                    </Link>
                  )}
                  {!unsubmitted &&
                    (open === c.id ? (
                      <button type="button" className="btn btn-sm btn-o ml-auto" onClick={() => setOpen(null)}>
                        Cancelar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-sm ml-auto ${live ? "btn-o !border-line-2 !text-danger" : ""}`}
                        onClick={() => setOpen(c.id)}
                      >
                        {live ? "Esconder do site" : "Publicar no site"}
                      </button>
                    ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
