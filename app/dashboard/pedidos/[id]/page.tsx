import Link from "next/link";
import { DetailList, type DetailRow } from "@/components/ui/DetailList";
import { PageHeader } from "@/components/ui/PageHeader";
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
  const isPickup = b.fulfilment_mode === "pickup";
  const details: (DetailRow | false)[] = [
    ["Serviço", `${b.offer_title} · ${MODE_LABEL[b.fulfilment_mode]}`],
    ["Data", `${dayLabel(b.date)}${b.time_label ? ` · ${b.time_label}` : ""}`],
    ["Pessoas / unidades", String(b.guests)],
    isPickup ? ["Código de levantamento", b.pickup_code ?? "Gerado ao aceitar"] : ["Morada", b.address ?? "—"],
    !!b.distance_km && ["Distância", `${String(b.distance_km).replace(".", ",")} km`],
    ["Estimativa", b.estimate ? euro(b.estimate) : "Sob orçamento"],
    ["Telemóvel", b.client?.phone ?? "—"],
    ["Email", b.client?.email ?? "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/pedidos" className="text-sm">
        ← Pedidos
      </Link>
      <PageHeader meta={`${b.ref} · ${STATUS_LABEL[b.status]}`} title={b.client?.name ?? "Cliente"} />
      <div className="flex flex-wrap items-start gap-6">
        <section className="box flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-6">
          <DetailList items={details} />
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
