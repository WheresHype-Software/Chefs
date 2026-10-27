import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { DayItems } from "@/components/dashboard/DayItems";
import { LogisticsSettings } from "@/components/dashboard/LogisticsSettings";
import { getBookings, getLogistics, requireChef } from "@/lib/dashboard";
import { isoDay, longDay, parseDay } from "@/lib/format";

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Logistica({ searchParams }: PageProps<"/dashboard/logistica">) {
  const { dia } = await searchParams;
  const chef = await requireChef();
  const today = isoDay(new Date());
  const selected = typeof dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : today;

  // Week strip: the next 7 days, or 7 days from the selected day when it falls outside them.
  const inNextWeek = selected >= today && (parseDay(selected).getTime() - parseDay(today).getTime()) / 86400_000 <= 6;
  const start = parseDay(inNextWeek ? today : selected);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return isoDay(d);
  });

  const [bookings, logistics] = await Promise.all([
    getBookings({ from: week[0], to: week[6], statuses: ["accepted", "confirmed", "completed"] }),
    getLogistics(),
  ]);
  const items = bookings.filter((b) => b.date === selected).sort((a, b) => (a.time_label ?? "").localeCompare(b.time_label ?? ""));
  const count = (t: string) => items.filter((i) => i.fulfilment_mode === t).length;
  const km = items.reduce((a, i) => a + Number(i.distance_km ?? 0), 0);
  const parts = [
    count("pickup") && `${count("pickup")} ${count("pickup") > 1 ? "levantamentos" : "levantamento"}`,
    count("delivery") && `${count("delivery")} ${count("delivery") > 1 ? "entregas" : "entrega"}`,
    count("home") && `${count("home")} em casa do cliente`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-[26px]">
      <PageHeader title="Deslocações, entregas e levantamentos" />

      <nav aria-label="Semana" className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {week.map((d) => {
          const n = bookings.filter((b) => b.date === d).length;
          return (
            <Link key={d} href={`?dia=${d}`} className="week-day" aria-current={d === selected ? "date" : undefined} scroll={false}>
              <span className="lab opacity-75">{WD[parseDay(d).getDay()]}</span>
              <span className="d text-[22px] leading-[1.1]">{parseDay(d).getDate()}</span>
              <span className="text-[11px] opacity-75">{n ? `${n} ${n > 1 ? "serviços" : "serviço"}` : "livre"}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-start gap-6">
        <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-3.5">
          <div className="box flex flex-wrap items-baseline gap-x-7 gap-y-2.5 px-5 py-[18px]">
            <span className="d text-2xl">{longDay(selected)}</span>
            <span className="num text-sm text-muted">
              {items.length ? parts.join(" · ") + (km ? ` · ${km.toFixed(1).replace(".", ",")} km a conduzir` : "") : "Sem serviços"}
            </span>
          </div>
          <DayItems key={selected} items={items} kitchenArea={chef.area_name ?? ""} />
        </section>
        <LogisticsSettings
          initial={logistics.logistics}
          zones={logistics.zones.map(({ name, active }) => ({ label: name, active }))}
          slots={logistics.slots.map(({ label, active }) => ({ label, active }))}
          area={chef.area_name ?? ""}
        />
      </div>
    </div>
  );
}
