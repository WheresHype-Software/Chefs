import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminQueueNav } from "@/components/admin/AdminQueueNav";
import { SupportInbox, type Ticket } from "@/components/admin/SupportInbox";
import { getSession } from "@/lib/dashboard";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Apoio", robots: { index: false } };

export default async function AdminApoio() {
  if (!hasSupabase) {
    return (
      <AdminShell title="Apoio">
        <p className="m-0 text-muted">O apoio liga-se quando o projeto Supabase estiver configurado.</p>
      </AdminShell>
    );
  }
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();

  const sb = await createClient();
  const { data } = await sb
    .from("support_tickets")
    .select(
      "id, ref, name, email, phone, category, booking_ref, subject, status, created_at, support_messages(id, author, body, created_at)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const tickets = ((data ?? []) as unknown as (Omit<Ticket, "messages"> & { support_messages: Ticket["messages"] })[]).map((t) => ({
    ...t,
    messages: [...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
  const open = tickets.filter((t) => t.status === "open");

  return (
    <AdminShell title="Apoio">
      <AdminQueueNav
        queues={[
          { id: "tudo", label: "Por responder", count: open.length },
          { id: "tudo", label: "Total", count: tickets.length },
        ]}
      />
      <section id="tudo" className="flex scroll-mt-16 flex-col gap-4">
        <SupportInbox tickets={tickets} />
      </section>
    </AdminShell>
  );
}
