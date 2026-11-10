import type { Metadata } from "next";
import Link from "next/link";
import { BookingChat } from "@/components/booking/BookingChat";
import { DepositPayment } from "@/components/booking/DepositPayment";
import { RefundIban } from "@/components/booking/RefundIban";
import { ClientBookingActions } from "@/components/booking/ClientBookingActions";
import { BookingReview } from "@/components/booking/BookingReview";
import { ReviewForm } from "@/components/booking/ReviewForm";
import { GuestLookupForm } from "@/components/booking/GuestLookup";
import { RememberBooking } from "@/components/booking/RememberBooking";
import { StatusSteps } from "@/components/booking/StatusSteps";
import { DetailList, type DetailRow } from "@/components/ui/DetailList";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CANCELLATION_LABEL, PAYMENT_LABEL } from "@/lib/data";
import { getBookingView } from "@/lib/bookings";
import { cardPaymentsPossible } from "@/lib/env";
import { getPaymentState, getRefundAwaitingIban } from "@/lib/deposit";
import { dayLabel, euro, titledFirst, titledName, MODE_LABEL, shortStamp, STATUS_LABEL } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "A sua reserva", robots: { index: false } };

const STEPS: { key: BookingStatus; label: string; hint: string }[] = [
  { key: "requested", label: "Pedido enviado", hint: "O chef tem 48 horas para responder" },
  { key: "accepted", label: "Aceite pelo chef", hint: "Pague o sinal para confirmar" },
  { key: "confirmed", label: "Confirmado", hint: "Assim que o sinal entrar" },
  { key: "completed", label: "Concluído", hint: "Depois do serviço poderá avaliar" },
];

/** Opened without access (no link, other device, or a wrong id): offer the lookup instead of a 404. */
function NoAccess() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[760px] flex-1 flex-col gap-6 px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <h1 className="d m-0 text-[clamp(30px,5vw,44px)] leading-[1.05]">Não conseguimos abrir este pedido aqui.</h1>
        <p className="m-0 max-w-[60ch] text-muted">
          Os pedidos abrem com o link que guardou (ou que recebeu por email), no dispositivo onde o pediu, ou com o número do pedido e o seu
          email.
        </p>
        <GuestLookupForm />
      </main>
      <SiteFooter />
    </div>
  );
}

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
  if (!view) return <NoAccess />;

  const { booking: b, chef } = view;
  const first = titledFirst(chef);
  const reached = (k: BookingStatus) => view.events.find((e) => e.to === k);
  const currentIdx = STEPS.findIndex((s) => s.key === (b.status === "change_proposed" ? "requested" : b.status));
  // Once the chef accepts, the amounts are frozen on the booking; before that, an estimate.
  const deposit = b.deposit_amount ?? (chef.depositPercent && b.estimate ? Math.round((b.estimate * chef.depositPercent) / 100) : null);
  const ended = ["declined", "cancelled", "expired"].includes(b.status);
  const awaitingDeposit = b.status === "accepted" && ["due", "pending", "overdue"].includes(b.deposit_status);
  const paymentState = awaitingDeposit && view.viewer === "client" ? await getPaymentState(id) : null;
  // A refund we could not push back the way it came waits here for the client's account.
  const refundWaiting = view.viewer === "client" ? await getRefundAwaitingIban(id) : null;

  const intro: Record<BookingStatus, string> = {
    requested: `${first} tem 48 horas para aceitar, recusar ou propor outra data. Ainda não paga nada.`,
    accepted: awaitingDeposit
      ? "Falta pagar o sinal. Assim que o pagamento entrar, a reserva fica confirmada."
      : "Combine o sinal diretamente com o chef. Quando o chef o marcar como recebido, a reserva fica confirmada.",
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
        {titledName(chef)}
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
    deposit !== null && [b.deposit_amount != null ? "Sinal" : `Sinal (${chef.depositPercent} %)`, euro(deposit)],
    b.deposit_status === "paid" && ["Sinal pago", b.deposit_paid_at ? shortStamp(b.deposit_paid_at) : "sim"],
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
            <Link href="/procurar" className="btn btn-o mt-2 self-start">
              Procurar outro chef
            </Link>
          )}
        </div>

        {!ended && (
          <StatusSteps
            // Completed is the last step and done, so nothing stays "current" after it.
            current={b.status === "completed" ? STEPS.length : currentIdx + (b.status === "change_proposed" ? 0 : 1)}
            action={b.status === "change_proposed" ? "Responda à proposta do chef" : undefined}
            steps={STEPS.map((s) => {
              const ev = reached(s.key);
              return { label: s.label, detail: ev ? shortStamp(ev.at) : s.hint };
            })}
          />
        )}
        {paymentState && (
          <DepositPayment
            bookingId={b.id}
            initial={paymentState}
            chefFirstName={first}
            bookingValue={b.booking_value ?? b.quoted_price ?? b.estimate}
            cardAvailable={cardPaymentsPossible}
          />
        )}
        {refundWaiting && <RefundIban bookingId={b.id} refund={refundWaiting} />}
        {view.viewer === "client" && <RememberBooking booking={{ id: b.id, ref: b.ref, chef: titledName(chef), date: b.date }} />}

        <div className="flex flex-wrap items-start gap-8">
          <section className="box flex min-w-0 flex-[1_1_340px] flex-col gap-4 p-6">
            <h2 className="d m-0 text-[28px]">Detalhes</h2>
            <DetailList items={details} />
            {b.status === "change_proposed" && (
              <div className="rounded-[2px] bg-paper p-3.5 text-sm">
                <strong className="font-semibold">{b.estimate == null ? `Orçamento de ${first}:` : `Proposta de ${first}:`}</strong>{" "}
                {[b.proposed_date && dayLabel(b.proposed_date), b.proposed_time, b.quoted_price && euro(b.quoted_price)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            <ClientBookingActions key={b.id} id={b.id} status={b.status} quote={b.estimate == null && b.quoted_price != null} />
            <span className="text-xs text-muted">
              {STATUS_LABEL[b.status]} ·{" "}
              {b.deposit_amount != null
                ? "O sinal é pago na app; o restante valor é combinado diretamente com o chef."
                : "O serviço, preços e pagamentos são combinados diretamente com o chef."}
            </span>
          </section>

          <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-8">
            {b.status === "completed" && !view.review && <ReviewForm id={b.id} chef={first} />}
            {view.review && <BookingReview review={view.review} title="A sua avaliação" />}
            <BookingChat
              key={b.id}
              view={view}
              title={titledName(chef)}
              photo={chef.portrait}
              subtitle={chef.responseHours ? `Responde normalmente em ${chef.responseHours} horas` : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
