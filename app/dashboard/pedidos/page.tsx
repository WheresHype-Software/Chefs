import Link from "next/link";
import { RequestActions } from "@/components/dashboard/RequestActions";
import { getBookings, type DashBooking } from "@/lib/dashboard";
import { dayLabel, euro, isoDay, MODE_LABEL, STATUS_LABEL } from "@/lib/format";

function hoursLeft(createdAt: string): number {
  return Math.max(0, Math.round(48 - (Date.now() - new Date(createdAt).getTime()) / 3600_000));
}

function Row({ b, showActions }: { b: DashBooking; showActions: boolean }) {
  return (
    <article className="box flex flex-wrap gap-5 p-5">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="lab text-muted">
            {MODE_LABEL[b.fulfilment_mode]} · {b.ref}
          </span>
          <span className={`lab ${b.status === "requested" ? "text-danger" : "text-muted"}`}>
            {b.status === "requested" ? `Expira em ${hoursLeft(b.created_at)} h` : STATUS_LABEL[b.status]}
          </span>
        </div>
        <Link href={`/dashboard/pedidos/${b.id}`} className="d text-[26px] leading-[1.1] no-underline">
          {b.client?.name ?? "Cliente"}
        </Link>
        <span className="text-sm text-ink-3">
          {b.offer_title} · {b.guests} · {dayLabel(b.date)}
          {b.time_label ? ` · ${b.time_label}` : ""}
          {b.estimate ? ` · ${euro(b.estimate)}` : ""}
        </span>
        {b.notes && <span className="border-l border-ink pl-3 text-sm text-ink-3">{b.notes}</span>}
      </div>
      <div className="flex flex-[1_1_260px] flex-col justify-between gap-3">
        {showActions && <RequestActions id={b.id} status={b.status} />}
        <Link href={`/dashboard/pedidos/${b.id}`} className="text-sm">
          Abrir conversa →
        </Link>
      </div>
    </article>
  );
}

export default async function Pedidos() {
  const today = isoDay(new Date());
  const [requests, upcoming, past] = await Promise.all([
    getBookings({ statuses: ["requested", "change_proposed"] }),
    getBookings({ from: today, statuses: ["accepted", "confirmed"] }),
    getBookings({ to: today, statuses: ["completed", "declined", "cancelled", "expired"] }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <span className="lab text-muted">Pedidos e reservas</span>
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">Pedidos</h1>
      </div>

      <section className="flex flex-col gap-3.5">
        <h2 className="lab m-0 border-b border-ink pb-2.5">Por responder · {requests.length}</h2>
        {requests.length === 0 && <p className="m-0 text-muted">Sem pedidos novos. Os pedidos expiram ao fim de 48 horas.</p>}
        {requests.map((b) => (
          <Row key={b.id} b={b} showActions />
        ))}
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="lab m-0 border-b border-ink pb-2.5">Próximas reservas · {upcoming.length}</h2>
        {upcoming.length === 0 && <p className="m-0 text-muted">Sem reservas marcadas.</p>}
        {upcoming.map((b) => (
          <Row key={b.id} b={b} showActions />
        ))}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="lab m-0 border-b border-ink pb-2.5">Histórico</h2>
          {past.slice(-20).reverse().map((b) => (
            <Row key={b.id} b={b} showActions={false} />
          ))}
        </section>
      )}
    </div>
  );
}
