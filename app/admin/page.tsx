import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { AdminQueueNav } from "@/components/admin/AdminQueueNav";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChefRoster, type RosterChef } from "@/components/admin/ChefRoster";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import type { PendingChef } from "@/components/admin/PendingChefCard";
import { TitleRequestCard } from "@/components/admin/TitleRequestCard";
import { certificateLinks } from "@/lib/admin/certificates";
import { emailHealth } from "@/lib/admin/health";
import { selfieLink } from "@/lib/selfie";
import { readiness } from "@/lib/admin/readiness";
import { StatGrid } from "@/components/ui/StatGrid";
import { getSession } from "@/lib/dashboard";
import { requiredDepositPercent } from "@/lib/money";
import { getSettings, moneyRules } from "@/lib/settings";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };

export default async function AdminPage() {
  if (!hasSupabase) {
    return (
      <AdminShell title="Administração">
        <p className="m-0 text-muted">A administração liga-se quando o projeto Supabase estiver configurado.</p>
      </AdminShell>
    );
  }
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();
  const sb = await createClient();

  const weekAgo = new Date(new Date().getTime() - 7 * 86400_000).toISOString();
  const [pending, titleRequests, reports, chefsApproved, requests, completed, reviews, roster, chefProfiles] = await Promise.all([
    sb
      .from("chefs")
      .select(
        "id, display_name, slug, tier, headline, bio, area_name, socials, badges, created_at, chef_photos(url, kind, caption, sort_order), chef_certifications(title, document_path), chef_categories(cuisine_categories(name_pt)), offers(count)",
      )
      .eq("status", "pending")
      .order("created_at"),
    // Approved cooks who sent a certificate and are not "Chef" yet.
    sb
      .from("chefs")
      .select("id, display_name, slug, badges, chef_certifications!inner(title, document_path)")
      .eq("status", "approved")
      .not("badges", "cs", "{certified}")
      .order("display_name"),
    sb.from("reports").select("id, target_id, reason, created_at").eq("status", "open").eq("target_type", "review").order("created_at"),
    sb.from("chefs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    sb.from("bookings").select("status", { count: "exact" }).gte("created_at", weekAgo),
    sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", weekAgo),
    sb.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    // Everything the approval queue no longer shows, so there is somewhere to manage it.
    sb
      .from("chefs")
      .select(
        "id, profile_id, display_name, slug, status, area_name, badges, deposit_percent, rating_avg, review_count, completed_bookings, chef_photos(kind), offers(active)",
      )
      .neq("status", "pending")
      .order("status")
      .order("display_name"),
    // Signed up as a chef and never created a profile: invisible everywhere else.
    sb.from("profiles").select("id, name, email, created_at").eq("role", "chef").order("created_at", { ascending: false }),
  ]);

  type WithCerts = { chef_certifications: { title: string; document_path: string | null }[] };
  const withLinks = <T extends WithCerts>(rows: T[]) =>
    Promise.all(rows.map(async (r) => ({ ...r, certificateDocs: await certificateLinks(sb, r.chef_certifications) })));
  // The verification selfie is private: the team sees it through a short-lived link.
  const withSelfie = <T extends { chef_photos: { url: string; kind: string }[] }>(rows: T[]) =>
    Promise.all(
      rows.map(async (r) => ({
        ...r,
        chef_photos: await Promise.all(
          r.chef_photos.map(async (p) => (p.kind === "selfie" ? { ...p, url: (await selfieLink(sb, p.url)) ?? "" } : p)),
        ),
      })),
    );
  // Complete applications first, each group oldest first (the query's order is kept within groups).
  const pendingChefs = (await withSelfie(await withLinks((pending.data ?? []) as unknown as Omit<PendingChef, "certificateDocs">[]))).sort(
    (a, b) => Number(readiness(b).ready) - Number(readiness(a).ready),
  );
  const titleQueue = await withLinks(
    (titleRequests.data ?? []) as unknown as ({ id: string; display_name: string; slug: string; badges: string[] } & WithCerts)[],
  );

  const [settings, mail] = await Promise.all([getSettings(), emailHealth()]);
  const minDeposit = settings.paymentsEnabled ? requiredDepositPercent(moneyRules(settings)) : 0;
  const rosterChefs: RosterChef[] = (
    (roster.data ?? []) as unknown as (Omit<RosterChef, "photos" | "activeOffers" | "minDeposit"> & {
      chef_photos: { kind: string }[];
      offers: { active: boolean }[];
    })[]
  ).map((c) => ({
    ...c,
    photos: (c.chef_photos ?? []).filter((p) => p.kind !== "selfie").length,
    activeOffers: (c.offers ?? []).filter((o) => o.active).length,
    minDeposit,
  }));

  const withProfile = new Set(((roster.data ?? []) as { profile_id: string | null }[]).map((c) => c.profile_id).filter(Boolean));
  const neverStarted = (
    (chefProfiles.data ?? []) as { id: string; name: string | null; email: string | null; created_at: string }[]
  ).filter((p) => !withProfile.has(p.id));

  const reqRows = requests.data ?? [];
  const answered = reqRows.filter((r) => !["requested", "expired"].includes(r.status)).length;
  const accepted = reqRows.filter((r) => ["accepted", "confirmed", "completed"].includes(r.status)).length;

  const reportedIds = (reports.data ?? []).map((r) => r.target_id);
  const { data: reportedReviews } = reportedIds.length
    ? await sb.from("reviews").select("id, author_name, comment, overall, chefs(display_name)").in("id", reportedIds)
    : { data: [] };

  return (
    <AdminShell title="Administração">
      <AdminQueueNav
        queues={[
          { id: "aprovar", label: "Perfis por aprovar", count: pendingChefs.length },
          { id: "titulos", label: "Títulos de Chef", count: titleQueue.length },
          { id: "denuncias", label: "Denúncias", count: reports.data?.length ?? 0 },
          { id: "chefs", label: "Chefs no site", count: rosterChefs.filter((c) => c.status === "approved").length },
        ]}
      />
      {mail.state !== "ok" && (
        <p className="box m-0 border-2 border-cobalt p-4 text-sm">
          <strong>{mail.state === "off" ? "Os emails não estão a ser enviados." : "Os emails estão a falhar."}</strong> {mail.detail} Isto
          afeta tudo: avisos de pedidos novos, aprovações, pagamentos e apoio.
        </p>
      )}

      <StatGrid
        size="md"
        items={[
          ["Chefs ativos", String(chefsApproved.count ?? 0)],
          ["Pedidos (7 dias)", String(requests.count ?? 0)],
          ["Taxa de aceitação", answered ? `${Math.round((accepted / answered) * 100)} %` : "—"],
          ["Concluídas (7 dias)", String(completed.count ?? 0)],
          ["Avaliações (7 dias)", String(reviews.count ?? 0)],
        ]}
      />

      <section id="aprovar" className="flex scroll-mt-16 flex-col gap-4">
        <h2 className="lab m-0 border-b border-line-2 pb-2.5">Perfis por aprovar · {pendingChefs.length}</h2>
        <ApprovalQueue chefs={pendingChefs} />
      </section>

      <section id="titulos" className="flex scroll-mt-16 flex-col gap-4">
        <h2 className="lab m-0 border-b border-line-2 pb-2.5">Pedidos de título de Chef · {titleQueue.length}</h2>
        {titleQueue.length ? (
          titleQueue.map((c) => (
            <TitleRequestCard key={c.id} chefId={c.id} name={c.display_name} slug={c.slug} badges={c.badges} docs={c.certificateDocs} />
          ))
        ) : (
          <p className="m-0 text-muted">Nenhum certificado por verificar.</p>
        )}
      </section>

      <section id="chefs" className="flex scroll-mt-16 flex-col gap-4">
        <h2 className="lab m-0 border-b border-line-2 pb-2.5">
          Chefs · {rosterChefs.filter((c) => c.status === "approved").length} no site,{" "}
          {rosterChefs.filter((c) => c.status !== "approved").length} escondidos
        </h2>
        {neverStarted.length > 0 && (
          <div className="box flex flex-col gap-2.5 p-5">
            <h3 className="d m-0 text-[18px] font-normal">Criaram conta e nunca criaram perfil · {neverStarted.length}</h3>
            <p className="m-0 text-sm text-muted">
              Escolheram «sou chef» e pararam antes do primeiro passo. Recebem um lembrete automático ao fim de 24 horas; vale a pena
              ligar-lhes se forem da sua zona.
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {neverStarted.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="font-semibold">{p.name ?? "sem nome"}</span>
                  {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
                  <span className="text-muted">desde {p.created_at.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ChefRoster chefs={rosterChefs} />
      </section>

      <section id="denuncias" className="flex scroll-mt-16 flex-col gap-4">
        <h2 className="lab m-0 border-b border-line-2 pb-2.5">Avaliações denunciadas · {reports.data?.length ?? 0}</h2>
        {(reports.data ?? []).map((r) => {
          const rv = (reportedReviews ?? []).find((x) => x.id === r.target_id) as
            | { id: string; author_name: string; comment: string | null; overall: number; chefs: { display_name: string } | null }
            | undefined;
          if (!rv) return null;
          return (
            <article key={r.id} className="box flex flex-col gap-3 p-5">
              <span className="lab text-muted">
                {rv.chefs?.display_name} · {rv.author_name} · ★ {rv.overall}
              </span>
              <p className="m-0">{rv.comment}</p>
              <span className="text-sm text-danger">Motivo: {r.reason}</span>
              <ReviewModeration reviewId={rv.id} reportId={r.id} />
            </article>
          );
        })}
      </section>
    </AdminShell>
  );
}
