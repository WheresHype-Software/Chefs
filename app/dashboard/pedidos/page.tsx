import type { ReactNode } from "react";
import { ActiveRow, HistoryRow } from "@/components/dashboard/BookingRows";
import { PageHeader } from "@/components/ui/PageHeader";
import { getBookings, type DashBooking } from "@/lib/dashboard";
import { isoDay } from "@/lib/format";

function Group({ title, hint, items, empty }: { title: string; hint?: string; items: DashBooking[]; empty?: ReactNode }) {
  if (!items.length && !empty) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-2 pb-2.5">
        <h2 className="m-0 text-[17px] font-bold">
          {title} <span className="font-normal text-muted">· {items.length}</span>
        </h2>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </div>
      {items.length === 0 ? <p className="m-0 text-muted">{empty}</p> : items.map((b) => <ActiveRow key={b.id} b={b} />)}
    </section>
  );
}

/**
 * Requests in the order a chef acts on them: to answer, to complete (past service days), coming
 * up. Finished bookings fold into a quiet, collapsed history so they never crowd the work.
 */
export default async function Pedidos() {
  const now = new Date();
  const today = isoDay(now);
  const yesterday = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const [requests, toComplete, upcoming, past] = await Promise.all([
    getBookings({ statuses: ["requested", "change_proposed"] }),
    getBookings({ to: yesterday, statuses: ["accepted", "confirmed"] }),
    getBookings({ from: today, statuses: ["accepted", "confirmed"] }),
    getBookings({ statuses: ["completed", "declined", "cancelled", "expired"] }),
  ]);
  const history = [...past].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Pedidos"
        description={`${requests.length} por responder · ${upcoming.length} ${upcoming.length === 1 ? "reserva marcada" : "reservas marcadas"}`}
      />

      <Group
        title="Por responder"
        hint="Os pedidos expiram ao fim de 48 horas."
        items={requests}
        empty="Sem pedidos novos. Quando um cliente pedir, aparece aqui e recebe um email."
      />
      <Group title="Por concluir" hint="Marque como concluída: o cliente recebe o pedido de avaliação." items={toComplete} />
      <Group title="Próximas reservas" items={upcoming} empty="Sem reservas marcadas." />

      {history.length > 0 && (
        <details className="group rounded-[12px] border border-line bg-paper">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="text-[16px] font-bold">
              Histórico <span className="font-normal text-muted">· {history.length}</span>
            </span>
            <span className="text-[14px] text-muted">
              <span className="group-open:hidden">Mostrar concluídos, recusados e cancelados</span>
              <span className="hidden group-open:inline">Esconder</span>
            </span>
          </summary>
          <ul className="m-0 list-none border-t border-line px-3 pb-2 pt-1">
            {history.map((b) => (
              <HistoryRow key={b.id} b={b} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
