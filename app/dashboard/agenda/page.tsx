import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AgendaGrid } from "@/components/dashboard/AgendaGrid";
import { getAvailability, getBookings } from "@/lib/dashboard";
import { isoDay, monthLabel } from "@/lib/format";

export default async function Agenda({ searchParams }: PageProps<"/dashboard/agenda">) {
  const { mes } = await searchParams;
  const now = new Date();
  const [y, m] =
    typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const year = y!;
  const month = m! - 1;
  const from = isoDay(new Date(year, month, 1));
  const to = isoDay(new Date(year, month + 1, 0));
  const [avail, bookings] = await Promise.all([getAvailability(from, to), getBookings({ from, to, statuses: ["accepted", "confirmed"] })]);
  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Só recebe pedidos quando pode"
        actions={
          <div className="flex items-center gap-2">
            <Link href={`?mes=${shift(-1)}`} className="ctl no-underline" aria-label="Mês anterior">
              ‹
            </Link>
            <span className="d min-w-44 text-center text-xl italic">{monthLabel(year, month)}</span>
            <Link href={`?mes=${shift(1)}`} className="ctl no-underline" aria-label="Mês seguinte">
              ›
            </Link>
          </div>
        }
      />
      <AgendaGrid
        key={from}
        year={year}
        month={month}
        initial={Object.fromEntries(avail.map((a) => [a.date, a.status]))}
        booked={bookings.map((b) => b.date)}
      />
    </div>
  );
}
