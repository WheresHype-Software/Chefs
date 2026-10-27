import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingChat } from "@/components/booking/BookingChat";
import { ClientBookingActions, ReviewForm } from "@/components/booking/ClientBookingActions";
import { DetailList, type DetailRow } from "@/components/ui/DetailList";
import { SiteHeader } from "@/components/SiteChrome";
import { CANCELLATION_LABEL, PAYMENT_LABEL } from "@/lib/data";
import { getBookingView } from "@/lib/bookings";
import { dayLabel, euro, firstName, MODE_LABEL, shortStamp, STATUS_LABEL } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "A sua reserva", robots: { index: false } };

const STEPS: { key: BookingStatus; label: string; hint: string }[] = [
  { key: "requested", label: "Pedido enviado", hint: "" },
  { key: "accepted", label: "Aceite pelo chef", hint: "Combine o sinal" },
  { key: "confirmed", label: "Confirmado", hint: "Após o sinal" },
  { key: "completed", label: "Concluído", hint: "Depois poderá avaliar" },
];

function headline(status: BookingStatus, chef: string): string {
  switch (status) {
    case "requested":
      return `Pedido enviado a ${chef}`;
    case "accepted":
      return `${chef} aceitou o seu pedido`;
    case "change_proposed":
      return `${chef} propôs uma alteração`;
    case "confirmed":
      return "Reserva confirmada";
    case "completed":
      return "Reserva concluída";
    case "declined":
      return `${chef} não pode aceitar este pedido`;
    case "cancelled":
      return "Reserva cancelada";
    case "expired":
      return "O pedido expirou";
  }
}

export default async function ReservaPage({ params }: PageProps<"/reserva/[id]">) {
  const { id } = await params;
  // A guest's ?t= token was already moved into an httpOnly cookie by the proxy.
  const view = await getBookingView(id);
  if (!view) notFound();

  const { booking: b, chef } = view;
  const first = firstName(chef.name);
  const reached = (k: BookingStatus) => view.events.find((e) => e.to === k);
  const currentIdx = STEPS.findIndex((s) => s.key === (b.status === "change_proposed" ? "requested" : b.status));
  const deposit = chef.depositPercent && b.estimate ? Math.round((b.estimate * chef.depositPercent) / 100) : null;
  const ended = ["declined", "cancelled", "expired"].includes(b.status);

  const intro: Record<BookingStatus, string> = {
    requested: `${first} tem 48 horas para aceitar, recusar ou propor outra data. Ainda não paga nada.`,
    accepted: "Combine o sinal diretamente com o chef. Quando o chef o marcar como recebido, a reserva fica confirmada.",
    change_proposed: "Veja a proposta abaixo. Se lhe servir, aceite e a reserva segue.",
    confirmed: "Está tudo combinado. Recebe um lembrete na véspera.",
    completed: "Conte como correu. A sua avaliação ajuda outros clientes e o chef.",
    declined: "Pode procurar outro chef disponível na mesma data.",
    cancelled: "Esta reserva foi cancelada.",
    expired: "O chef não respondeu a tempo. Experimente outro chef disponível na mesma data.",
  };

  const details: (DetailRow | false | null)[] = [
    [
      "Chef",
      <Link key="c" href={`/chef/${chef.slug}`}>
        {chef.name}
      </Link>,
    ],
    ["Serviço", `${b.offer_title} · ${MODE_LABEL[b.fulfilment_mode]}`],
    ["Data", `${dayLabel(b.date)}${b.time_label ? ` · ${b.time_label}` : ""}`],
    ["Pessoas / unidades", String(b.guests)],
    b.fulfilment_mode === "pickup"
      ? ["Levantamento", view.pickupAddress ?? `${chef.area} · morada enviada quando o pedido for aceite`]
      : ["Morada", b.address ?? "—"],
    !!b.pickup_code && ["Código de levantamento", b.pickup_code],
    ["Estimativa", b.quoted_price ? euro(b.quoted_price) : b.estimate ? euro(b.estimate) : "Sob orçamento"],
    deposit !== null && [`Sinal (${chef.depositPercent} %)`, euro(deposit)],
    ["Pagamento", chef.paymentMethods.map((m) => PAYMENT_LABEL[m] ?? m).join(" · ")],
    view.policy && ["Cancelamento", view.policy.text ?? CANCELLATION_LABEL[view.policy.preset] ?? ""],
  ];

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 pb-[72px] pt-10 md:px-8">
        <div className="flex flex-col gap-2.5">
          <h1 className="d m-0 text-[clamp(32px,4.4vw,48px)] leading-[1.05]">{headline(b.status, first)}</h1>
          <span className="text-[15px] font-medium text-muted">Pedido n.º {b.ref}</span>
          <p className="m-0 max-w-[640px] text-muted">{intro[b.status]}</p>
          {ended && (
            <Link href="/#mapa" className="btn btn-o mt-2 self-start">
              Procurar outro chef
            </Link>
          )}
        </div>

        {!ended && (
          <ol aria-label="Estado" className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 text-sm md:grid-cols-4">
            {STEPS.map((s, i) => {
              const done = i <= currentIdx;
              const ev = reached(s.key);
              return (
                <li key={s.key} className="flex flex-col gap-2" aria-current={i === currentIdx ? "step" : undefined}>
                  <span className={`h-1 rounded ${done ? "bg-cobalt" : "bg-line"}`} />
                  <strong className="font-semibold">{s.label}</strong>
                  <span className="text-muted">{ev ? shortStamp(ev.at) : s.hint}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex flex-wrap items-start gap-8">
          <section className="box flex min-w-0 flex-[1_1_340px] flex-col gap-4 p-6">
            <h2 className="d m-0 text-[28px]">Detalhes</h2>
            <DetailList items={details} />
            {b.status === "change_proposed" && (
              <div className="rounded-[2px] bg-paper p-3.5 text-sm">
                <strong className="font-semibold">Proposta de {first}:</strong>{" "}
                {[b.proposed_date && dayLabel(b.proposed_date), b.proposed_time, b.quoted_price && euro(b.quoted_price)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            <ClientBookingActions id={b.id} status={b.status} />
            <span className="text-xs text-muted">
              {STATUS_LABEL[b.status]} · O serviço, preços e pagamentos são combinados diretamente com o chef.
            </span>
          </section>

          <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-8">
            {b.status === "completed" && !view.review && <ReviewForm id={b.id} chef={first} />}
            <BookingChat
              view={view}
              title={chef.name}
              subtitle={chef.responseHours ? `Responde normalmente em ${chef.responseHours} horas` : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
