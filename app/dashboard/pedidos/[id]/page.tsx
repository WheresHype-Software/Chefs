import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingChat } from "@/components/booking/BookingChat";
import { RequestActions } from "@/components/dashboard/RequestActions";
import { getBookingView } from "@/lib/bookings";
import { getBooking } from "@/lib/dashboard";
import { dayLabel, euro, MODE_LABEL, STATUS_LABEL } from "@/lib/format";

export default async function PedidoDetalhe({ params }: PageProps<"/dashboard/pedidos/[id]">) {
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();
  const view = await getBookingView(id);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/pedidos" className="text-sm">
        ← Pedidos
      </Link>
      <div className="flex flex-col gap-1.5">
        <span className="lab text-muted">
          {b.ref} · {STATUS_LABEL[b.status]}
        </span>
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">{b.client?.name ?? "Cliente"}</h1>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <section className="box flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-6">
          <dl className="m-0 flex flex-col gap-3 text-[15px]">
            {[
              ["Serviço", `${b.offer_title} · ${MODE_LABEL[b.fulfilment_mode]}`],
              ["Data", `${dayLabel(b.date)}${b.time_label ? ` · ${b.time_label}` : ""}`],
              ["Pessoas / unidades", String(b.guests)],
              [b.fulfilment_mode === "pickup" ? "Código de levantamento" : "Morada", b.fulfilment_mode === "pickup" ? (b.pickup_code ?? "Gerado ao aceitar") : (b.address ?? "—")],
              ...(b.distance_km ? [["Distância", `${String(b.distance_km).replace(".", ",")} km`]] : []),
              ["Estimativa", b.estimate ? euro(b.estimate) : "Sob orçamento"],
              ["Telemóvel", b.client?.phone ?? "—"],
              ["Email", b.client?.email ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className="m-0 text-right">{v}</dd>
              </div>
            ))}
          </dl>
          {b.notes && <span className="rounded-[2px] bg-paper px-3 py-2.5 text-sm text-ink-3">{b.notes}</span>}
          <RequestActions id={b.id} status={b.status} />
        </section>
        <div className="flex min-w-0 flex-[2_1_480px] flex-col">
          {view && <BookingChat view={{ ...view, viewer: "chef" }} title={b.client?.name ?? "Cliente"} subtitle={b.client?.email} />}
        </div>
      </div>
    </div>
  );
}
