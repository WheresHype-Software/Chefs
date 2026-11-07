import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AprovacoesTabs } from "@/components/admin/AprovacoesTabs";
import { TitleRequestCard } from "@/components/admin/TitleRequestCard";
import { getTitleRequests } from "@/lib/admin/queues";
import { getSession } from "@/lib/dashboard";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Títulos de Chef", robots: { index: false } };

export default async function TitulosPage() {
  if (!hasSupabase) notFound();
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();
  const queue = await getTitleRequests();

  return (
    <AdminShell title="Títulos de Chef">
      <AprovacoesTabs />
      <p className="m-0 max-w-[62ch] text-muted">
        Cozinheiros já aprovados que enviaram um certificado. O título muda como aparecem nas pesquisas, por isso o documento é visto por
        uma pessoa.
      </p>
      <section className="flex flex-col gap-4">
        {queue.length ? (
          queue.map((c) => (
            <TitleRequestCard key={c.id} chefId={c.id} name={c.display_name} slug={c.slug} badges={c.badges} docs={c.certificateDocs} />
          ))
        ) : (
          <p className="m-0 text-muted">Nenhum certificado por verificar.</p>
        )}
      </section>
    </AdminShell>
  );
}
