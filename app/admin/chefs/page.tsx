import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AprovacoesTabs } from "@/components/admin/AprovacoesTabs";
import { ChefRoster } from "@/components/admin/ChefRoster";
import { getRoster } from "@/lib/admin/queues";
import { getSession } from "@/lib/dashboard";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chefs", robots: { index: false } };

export default async function ChefsPage() {
  if (!hasSupabase) notFound();
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();
  const { chefs, neverStarted } = await getRoster();
  const live = chefs.filter((c) => c.status === "approved").length;

  return (
    <AdminShell title="Chefs">
      <AprovacoesTabs />
      <p className="m-0 text-muted">
        {live} no site, {chefs.length - live} escondidos
      </p>

      {neverStarted.length > 0 && (
        <section className="box flex flex-col gap-2.5 p-5">
          <h2 className="d m-0 text-[18px] font-normal">Criaram conta e nunca criaram perfil · {neverStarted.length}</h2>
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
        </section>
      )}

      <ChefRoster chefs={chefs} />
    </AdminShell>
  );
}
