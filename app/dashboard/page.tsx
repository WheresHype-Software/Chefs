import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { redirect } from "next/navigation";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { getBookings, getMyChef, getSession, getSetupProgress } from "@/lib/dashboard";
import { dayLabel, isoDay, longDay, rating } from "@/lib/format";

export default async function Overview() {
  const session = await getSession();
  const chef = await getMyChef();
  if (!chef) {
    // Admins without their own chef page belong in the admin area; clients never get here (layout).
    redirect(session.role === "admin" ? "/admin" : "/dashboard/perfil");
  }

  const today = isoDay(new Date());
  const in7 = new Date();
  in7.setDate(in7.getDate() + 6);
  const [requests, week, progress] = await Promise.all([
    getBookings({ statuses: ["requested"] }),
    getBookings({ from: today, to: isoDay(in7), statuses: ["accepted", "confirmed"] }),
    getSetupProgress(),
  ]);
  const byDay = new Map<string, number>();
  week.forEach((b) => byDay.set(b.date, (byDay.get(b.date) ?? 0) + 1));
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestItems = busiest ? week.filter((b) => b.date === busiest[0]) : [];

  return (
    <div className="flex flex-col gap-6">
      <SetupChecklist chef={chef} progress={progress} />

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
          <div className="flex items-baseline justify-between border-b border-line-2 pb-3">
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
              <span className="lab rounded-[2px] bg-cobalt px-2.5 py-1.5 text-white">Responder</span>
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
