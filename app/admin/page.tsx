import type { Metadata } from "next";
import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/SiteChrome";
import { notFound } from "next/navigation";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { AdminQueueNav } from "@/components/admin/AdminQueueNav";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import type { PendingChef } from "@/components/admin/PendingChefCard";
import { TitleRequestCard } from "@/components/admin/TitleRequestCard";
import { certificateLinks } from "@/lib/admin/certificates";
import { selfieLink } from "@/lib/selfie";
import { readiness } from "@/lib/admin/readiness";
import { StatGrid } from "@/components/ui/StatGrid";
import { getSession } from "@/lib/dashboard";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };

export default async function AdminPage() {
  if (!hasSupabase) {
    return (
      <Shell>
        <p className="m-0 text-muted">A administração liga-se quando o projeto Supabase estiver configurado.</p>
      </Shell>
    );
  }
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();
  const sb = await createClient();

  const weekAgo = new Date(new Date().getTime() - 7 * 86400_000).toISOString();
  const [pending, titleRequests, reports, chefsApproved, requests, completed, reviews] = await Promise.all([
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
      .select("id, display_name, slug, chef_certifications!inner(title, document_path)")
      .eq("status", "approved")
      .not("badges", "cs", "{certified}")
      .order("display_name"),
    sb.from("reports").select("id, target_id, reason, created_at").eq("status", "open").eq("target_type", "review").order("created_at"),
    sb.from("chefs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    sb.from("bookings").select("status", { count: "exact" }).gte("created_at", weekAgo),
    sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", weekAgo),
    sb.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
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
    (titleRequests.data ?? []) as unknown as ({ id: string; display_name: string; slug: string } & WithCerts)[],
  );

  const reqRows = requests.data ?? [];
  const answered = reqRows.filter((r) => !["requested", "expired"].includes(r.status)).length;
  const accepted = reqRows.filter((r) => ["accepted", "confirmed", "completed"].includes(r.status)).length;

  const reportedIds = (reports.data ?? []).map((r) => r.target_id);
  const { data: reportedReviews } = reportedIds.length
    ? await sb.from("reviews").select("id, author_name, comment, overall, chefs(display_name)").in("id", reportedIds)
    : { data: [] };

  return (
    <Shell>
      <AdminQueueNav
        queues={[
          { id: "aprovar", label: "Perfis por aprovar", count: pendingChefs.length },
          { id: "titulos", label: "Títulos de Chef", count: titleQueue.length },
          { id: "denuncias", label: "Denúncias", count: reports.data?.length ?? 0 },
        ]}
      />
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
          titleQueue.map((c) => <TitleRequestCard key={c.id} chefId={c.id} name={c.display_name} slug={c.slug} docs={c.certificateDocs} />)
        ) : (
          <p className="m-0 text-muted">Nenhum certificado por verificar.</p>
        )}
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const brand = (
    <Link href="/" className="no-underline" aria-label="Ao Lume, página inicial">
      <Wordmark />
    </Link>
  );
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 md:px-8">
          {brand}
          <MobileMenu
            brand={brand}
            links={[
              { href: "/admin", label: "Administração" },
              { href: "/dashboard", label: "Painel" },
              { href: "/", label: "Página inicial" },
            ]}
            actions={<SignOutButton block />}
          />
          <div className="hidden items-baseline gap-5 text-sm md:flex">
            <Link href="/dashboard" className="text-muted no-underline hover:text-ink">
              Painel
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-10 md:px-8">
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">Administração</h1>
        {children}
      </main>
    </div>
  );
}
