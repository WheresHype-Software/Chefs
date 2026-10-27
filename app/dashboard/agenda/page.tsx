import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AgendaGrid } from "@/components/dashboard/AgendaGrid";
import { getAvailability, getBookings, getSetupProgress } from "@/lib/dashboard";
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
  const [avail, bookings, progress] = await Promise.all([
    getAvailability(from, to),
    getBookings({ from, to, statuses: ["accepted", "confirmed"] }),
    getSetupProgress(),
  ]);
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
      {progress.openDays === 0 && (
        <div role="status" className="flex flex-col gap-1.5 rounded-[10px] border border-cobalt/30 bg-cobalt-soft p-5">
          <span className="d text-xl">Ainda não abriu nenhum dia.</span>
          <span className="text-[15px] text-ink-3">
            Os clientes só podem pedir reserva nos dias abertos. Escolha abaixo os dias da semana em que costuma cozinhar, ou toque em cada
            dia do calendário.
            {progress.activeOffers === 0 && " Lembre-se de criar também uma oferta, em Ofertas."}
          </span>
        </div>
      )}
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
