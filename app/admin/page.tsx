import type { Metadata } from "next";
import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/SiteChrome";
import { notFound } from "next/navigation";
import { ReviewModeration } from "@/components/admin/ChefDecision";
import { PendingChefCard, type PendingChef } from "@/components/admin/PendingChefCard";
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
  const [pending, reports, chefsApproved, requests, completed, reviews] = await Promise.all([
    sb
      .from("chefs")
      .select(
        "id, display_name, slug, tier, area_name, socials, badges, created_at, chef_photos(url, kind, caption, sort_order), chef_certifications(title, document_path)",
      )
      .eq("status", "pending")
      .order("created_at"),
    sb.from("reports").select("id, target_id, reason, created_at").eq("status", "open").eq("target_type", "review").order("created_at"),
    sb.from("chefs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    sb.from("bookings").select("status", { count: "exact" }).gte("created_at", weekAgo),
    sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", weekAgo),
    sb.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
  ]);

  const reqRows = requests.data ?? [];
  const answered = reqRows.filter((r) => !["requested", "expired"].includes(r.status)).length;
  const accepted = reqRows.filter((r) => ["accepted", "confirmed", "completed"].includes(r.status)).length;

  const reportedIds = (reports.data ?? []).map((r) => r.target_id);
  const { data: reportedReviews } = reportedIds.length
    ? await sb.from("reviews").select("id, author_name, comment, overall, chefs(display_name)").in("id", reportedIds)
    : { data: [] };

  return (
    <Shell>
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

      <section className="flex flex-col gap-4">
        <h2 className="lab m-0 border-b border-line-2 pb-2.5">Chefs por aprovar · {pending.data?.length ?? 0}</h2>
        {(pending.data as PendingChef[] | null)?.map((c) => (
          <PendingChefCard key={c.id} chef={c} />
        ))}
      </section>

      <section className="flex flex-col gap-4">
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
