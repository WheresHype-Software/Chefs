import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { BookingChat } from "@/components/booking/BookingChat";
import { DepositPayment } from "@/components/booking/DepositPayment";
import { RefundIban } from "@/components/booking/RefundIban";
import { ClientBookingActions } from "@/components/booking/ClientBookingActions";
import { BookingReview } from "@/components/booking/BookingReview";
import { ReviewForm } from "@/components/booking/ReviewForm";
import { GuestLookupForm } from "@/components/booking/GuestLookup";
import { RememberBooking } from "@/components/booking/RememberBooking";
import { StatusSteps } from "@/components/booking/StatusSteps";
import { paymentKey, policyKey } from "@/components/chef/labels";
import { DetailList, type DetailRow } from "@/components/ui/DetailList";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getBookingView } from "@/lib/bookings";
import { cardPaymentsPossible } from "@/lib/env";
import { getPaymentState, getRefundAwaitingIban } from "@/lib/deposit";
import { dayLabel, euro, modeLabel, shortStamp, statusLabel, titledFirst, titledName } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import type { BookingStatus } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[locale]/reserva/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "booking.status" });
  return { title: t("metaTitle"), robots: { index: false } };
}

const STEP_KEYS = ["requested", "accepted", "confirmed", "completed"] as const;

/** Opened without access (no link, other device, or a wrong id): offer the lookup instead of a 404. */
async function NoAccess() {
  const t = await getTranslations("booking.status.noAccess");
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[760px] flex-1 flex-col gap-6 px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <h1 className="d m-0 text-[clamp(30px,5vw,44px)] leading-[1.05]">{t("title")}</h1>
        <p className="m-0 max-w-[60ch] text-muted">{t("text")}</p>
        <GuestLookupForm />
      </main>
      <SiteFooter />
    </div>
  );
}

type HeadlineT = Awaited<ReturnType<typeof getTranslations<"booking.status.headline">>>;

function headline(t: HeadlineT, status: BookingStatus, chef: string): string {
  switch (status) {
    case "requested":
      return t("requested", { name: chef });
    case "accepted":
      return t("accepted", { name: chef });
    case "change_proposed":
      return t("changeProposed", { name: chef });
    case "confirmed":
      return t("confirmed");
    case "completed":
      return t("completed");
    case "declined":
      return t("declined", { name: chef });
    case "cancelled":
      return t("cancelled");
    case "expired":
      return t("expired");
  }
}

export default async function ReservaPage({ params }: PageProps<"/[locale]/reserva/[id]">) {
  const { id } = await params;
  const locale = (await getLocale()) as Locale;
  // A guest's ?t= token was already moved into an httpOnly cookie by the proxy.
  const view = await getBookingView(id);
  if (!view) return <NoAccess />;

  const t = await getTranslations("booking.status");
  const td = await getTranslations("booking.status.details");
  const tHead = await getTranslations("booking.status.headline");
  const tSteps = await getTranslations("booking.status.steps");
  const tTerms = await getTranslations("chef.terms");
  const { booking: b, chef } = view;
  const first = titledFirst(chef, locale);
  const reached = (k: BookingStatus) => view.events.find((e) => e.to === k);
  const currentIdx = STEP_KEYS.findIndex((s) => s === (b.status === "change_proposed" ? "requested" : b.status));
  // Once the chef accepts, the amounts are frozen on the booking; before that, an estimate.
  const deposit = b.deposit_amount ?? (chef.depositPercent && b.estimate ? Math.round((b.estimate * chef.depositPercent) / 100) : null);
  const ended = ["declined", "cancelled", "expired"].includes(b.status);
  const awaitingDeposit = b.status === "accepted" && ["due", "pending", "overdue"].includes(b.deposit_status);
  const paymentState = awaitingDeposit && view.viewer === "client" ? await getPaymentState(id) : null;
  // A refund we could not push back the way it came waits here for the client's account.
  const refundWaiting = view.viewer === "client" ? await getRefundAwaitingIban(id) : null;

  const intro: Record<BookingStatus, string> = {
    requested: t("intro.requested", { name: first }),
    accepted: awaitingDeposit ? t("intro.acceptedDeposit") : t("intro.acceptedDirect"),
    change_proposed: t("intro.changeProposed"),
    confirmed: t("intro.confirmed"),
    completed: t("intro.completed"),
    declined: t("intro.declined"),
    cancelled: t("intro.cancelled"),
    expired: t("intro.expired"),
  };

  const payment = chef.paymentMethods
    .map((m) => {
      const mk = paymentKey(m);
      return mk ? tTerms(`payment.${mk}`) : m;
    })
    .join(" · ");
  const pk = view.policy ? policyKey(view.policy.preset) : null;
  const cancellation = view.policy ? view.policy.text ?? (pk ? tTerms(`policy.${pk}`) : "") : null;

  const details: (DetailRow | false | null)[] = [
    [
      td("chef"),
      <Link key="c" href={`/chef/${chef.slug}`}>
        {titledName(chef, locale)}
      </Link>,
    ],
    [td("service"), `${b.offer_title} · ${modeLabel(b.fulfilment_mode, locale)}`],
    [td("date"), `${dayLabel(b.date, locale)}${b.time_label ? ` · ${b.time_label}` : ""}`],
    [td("guests"), String(b.guests)],
    b.fulfilment_mode === "pickup"
      ? [td("pickup"), view.pickupAddress ?? td("pickupPending", { area: chef.area ?? "" })]
      : [td("address"), b.address ?? "—"],
    !!b.pickup_code && [td("pickupCode"), b.pickup_code],
    [td("estimate"), b.quoted_price ? euro(b.quoted_price, locale) : b.estimate ? euro(b.estimate, locale) : td("quote")],
    deposit !== null && [
      b.deposit_amount != null ? td("deposit") : td("depositPercent", { percent: chef.depositPercent ?? 0 }),
      euro(deposit, locale),
    ],
    b.deposit_status === "paid" && [td("depositPaid"), b.deposit_paid_at ? shortStamp(b.deposit_paid_at, locale) : td("yes")],
    [td("payment"), payment],
    cancellation != null && [td("cancellation"), cancellation],
  ];

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 pb-[72px] pt-10 md:px-8">
        <div className="flex flex-col gap-2.5">
          <h1 className="d m-0 text-[clamp(32px,4.4vw,48px)] leading-[1.05]">{headline(tHead, b.status, first)}</h1>
          <span className="text-[15px] font-medium text-muted">{t("ref", { ref: b.ref })}</span>
          <p className="m-0 max-w-[640px] text-muted">{intro[b.status]}</p>
          {ended && (
            <Link href="/procurar" className="btn btn-o mt-2 self-start">
              {t("findAnother")}
            </Link>
          )}
        </div>

        {!ended && (
          <StatusSteps
            // Completed is the last step and done, so nothing stays "current" after it.
            current={b.status === "completed" ? STEP_KEYS.length : currentIdx + (b.status === "change_proposed" ? 0 : 1)}
            action={b.status === "change_proposed" ? tSteps("answerProposal") : undefined}
            steps={STEP_KEYS.map((key) => {
              const ev = reached(key);
              return { label: statusLabel(key, locale), detail: ev ? shortStamp(ev.at, locale) : tSteps(key) };
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
        {view.viewer === "client" && <RememberBooking booking={{ id: b.id, ref: b.ref, chef: titledName(chef, locale), date: b.date }} />}

        <div className="flex flex-wrap items-start gap-8">
          <section className="box flex min-w-0 flex-[1_1_340px] flex-col gap-4 p-6">
            <h2 className="d m-0 text-[28px]">{td("title")}</h2>
            <DetailList items={details} />
            {b.status === "change_proposed" && (
              <div className="rounded-[2px] bg-paper p-3.5 text-sm">
                <strong className="font-semibold">
                  {b.estimate == null ? t("proposal.quote", { name: first }) : t("proposal.change", { name: first })}
                </strong>{" "}
                {[b.proposed_date && dayLabel(b.proposed_date, locale), b.proposed_time, b.quoted_price && euro(b.quoted_price, locale)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            <ClientBookingActions key={b.id} id={b.id} status={b.status} quote={b.estimate == null && b.quoted_price != null} />
            <span className="text-xs text-muted">
              {statusLabel(b.status, locale)} · {b.deposit_amount != null ? t("footnote.deposit") : t("footnote.direct")}
            </span>
          </section>

          <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-8">
            {b.status === "completed" && !view.review && <ReviewForm id={b.id} chef={first} />}
            {view.review && <BookingReview review={view.review} title={t("yourReview")} />}
            <BookingChat
              key={b.id}
              view={view}
              title={titledName(chef, locale)}
              photo={chef.portrait}
              subtitle={chef.responseHours ? t("responds", { hours: chef.responseHours }) : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
