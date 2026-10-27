import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { redirect } from "next/navigation";
import { getBookings, getMyChef, getSession } from "@/lib/dashboard";
import { dayLabel, isoDay, longDay, rating, STATUS_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function Overview() {
  const session = await getSession();
  const chef = await getMyChef();
  if (!chef) {
    if (session.role === "chef") redirect("/dashboard/perfil");
    return <ClientHome />;
  }

  const today = isoDay(new Date());
  const in7 = new Date();
  in7.setDate(in7.getDate() + 6);
  const [requests, week] = await Promise.all([
    getBookings({ statuses: ["requested"] }),
    getBookings({ from: today, to: isoDay(in7), statuses: ["accepted", "confirmed"] }),
  ]);
  const byDay = new Map<string, number>();
  week.forEach((b) => byDay.set(b.date, (byDay.get(b.date) ?? 0) + 1));
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestItems = busiest ? week.filter((b) => b.date === busiest[0]) : [];

  return (
    <div className="flex flex-col gap-6">
      {chef.status !== "approved" && (
        <div className="box flex flex-wrap items-center justify-between gap-4 p-6">
          <span className="flex flex-col gap-1">
            <span className="d text-2xl">{chef.status === "pending" ? "O seu perfil está em revisão" : "Complete o seu perfil"}</span>
            <span className="text-muted">
              {chef.status === "pending"
                ? "A nossa equipa responde por email. Entretanto pode preparar ofertas e a agenda."
                : chef.status === "rejected"
                  ? `Pedimos alterações: ${chef.verification_notes ?? "veja o email que enviámos."}`
                  : "Fotografia, Instagram ou site e três fotos de pratos, depois envie para revisão."}
            </span>
          </span>
          <Link href="/dashboard/perfil" className="btn">
            Abrir perfil
          </Link>
        </div>
      )}

      <PageHeader meta={longDay(today)} title={`Olá, ${chef.display_name.split(" ")[0]}`} />

      <StatGrid
        items={[
          ["Pedidos por responder", String(requests.length)],
          ["Serviços esta semana", String(week.length)],
          ["Entregas", String(week.filter((b) => b.fulfilment_mode === "delivery").length)],
          ["Avaliação", rating(chef.rating_avg, chef.review_count).replace("★ ", "")],
        ]}
      />

      {requests.length > 0 && (
        <section className="box flex flex-col p-6">
          <div className="flex items-baseline justify-between border-b border-ink pb-3">
            <h2 className="d m-0 text-2xl">Novos pedidos</h2>
            <Link href="/dashboard/pedidos" className="text-sm">
              Ver todos →
            </Link>
          </div>
          {requests.slice(0, 4).map((b) => (
            <Link
              key={b.id}
              href={`/dashboard/pedidos/${b.id}`}
              className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line py-4 text-ink no-underline last:border-b-0"
            >
              <span className="flex flex-col">
                <span className="d text-xl">{b.client?.name ?? "Cliente"}</span>
                <span className="text-[13px] text-muted">
                  {b.offer_title} · {b.guests} · {dayLabel(b.date)}
                </span>
              </span>
              <span className="lab rounded-[2px] bg-ink px-2.5 py-1.5 text-white">Responder</span>
            </Link>
          ))}
        </section>
      )}

      {busiest && (
        <div className="box flex flex-wrap items-center justify-between gap-4 p-6">
          <span className="flex flex-col gap-1">
            <span className="d text-2xl">{longDay(busiest[0]).split(",")[0]} é o seu dia mais cheio</span>
            <span className="text-muted">
              {busiestItems.length} {busiestItems.length === 1 ? "serviço" : "serviços"}:{" "}
              {busiestItems.map((b) => `${b.time_label ?? ""} ${b.offer_title}`.trim()).join(" · ")}
            </span>
          </span>
          <Link href={`/dashboard/logistica?dia=${busiest[0]}`} className="btn">
            Ver logística do dia
          </Link>
        </div>
      )}
    </div>
  );
}

/** Registered clients without a chef profile see their bookings. */
async function ClientHome() {
  const sb = await createClient();
  const { data } = await sb
    .from("bookings")
    .select("id, ref, status, offer_title, date, guests, chefs(display_name, slug)")
    .order("date", { ascending: false });
  const rows = (data ?? []) as unknown as {
    id: string;
    ref: string;
    status: keyof typeof STATUS_LABEL;
    offer_title: string;
    date: string;
    guests: number;
    chefs: { display_name: string; slug: string } | null;
  }[];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">As minhas reservas</h1>
      {rows.length === 0 ? (
        <div className="box flex flex-col gap-3 p-6">
          <span className="text-muted">Ainda não tem reservas.</span>
          <Link href="/#mapa" className="btn self-start">
            Encontrar um chef
          </Link>
        </div>
      ) : (
        <div className="box p-6">
          {rows.map((b) => (
            <Link
              key={b.id}
              href={`/reserva/${b.id}`}
              className="flex flex-wrap justify-between gap-3 border-b border-line py-4 text-ink no-underline last:border-b-0"
            >
              <span className="flex flex-col">
                <span className="d text-xl">{b.chefs?.display_name}</span>
                <span className="text-[13px] text-muted">
                  {b.offer_title} · {b.guests} · {dayLabel(b.date)}
                </span>
              </span>
              <span className="lab text-muted">{STATUS_LABEL[b.status]}</span>
            </Link>
          ))}
        </div>
      )}
      <Link href="/entrar?chef=1" className="text-sm">
        É chef? Crie o seu perfil →
      </Link>
    </div>
  );
}
