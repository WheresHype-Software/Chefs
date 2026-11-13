import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { DetailList, type DetailRow } from "@/components/ui/DetailList";
import { PageHeader } from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { BookingChat } from "@/components/booking/BookingChat";
import { BookingMoney } from "@/components/dashboard/BookingMoney";
import { ContactClient } from "@/components/dashboard/ContactClient";
import { BookingReview } from "@/components/booking/BookingReview";
import { ReviewReply } from "@/components/dashboard/ReviewReply";
import { RequestActions } from "@/components/dashboard/RequestActions";
import { getBookingView } from "@/lib/bookings";
import { getBooking, quoteMinimum } from "@/lib/dashboard";
import { dayLabel, modeLabel, statusLabel } from "@/lib/format";

export default async function PedidoDetalhe({ params }: PageProps<"/[locale]/dashboard/pedidos/[id]">) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.request");
  const td = await getTranslations("dashboard");
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();
  const [view, minQuote] = await Promise.all([getBookingView(id), quoteMinimum()]);
  const needsPrice = b.estimate == null && b.quoted_price == null;
  const isPickup = b.fulfilment_mode === "pickup";
  const details: (DetailRow | false)[] = [
    [t("service"), `${b.offer_title} · ${modeLabel(b.fulfilment_mode, locale)}`],
    [t("date"), `${dayLabel(b.date, locale)}${b.time_label ? ` · ${b.time_label}` : ""}`],
    [t("guests"), String(b.guests)],
    isPickup ? [t("pickupCode"), b.pickup_code ?? t("pickupCodePending")] : [t("address"), b.address ?? "—"],
    !!b.distance_km && [t("distance"), t("km", { km: String(b.distance_km).replace(".", locale === "pt" ? "," : ".") })],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/pedidos" className="text-sm">
        {t("back")}
      </Link>
      <PageHeader meta={`${b.ref} · ${statusLabel(b.status, locale)}`} title={b.client?.name ?? td("client")} />
      <div className="flex flex-wrap items-start gap-6">
        <section className="box flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-6">
          <DetailList items={details} />
          <ContactClient name={b.client?.name} phone={b.client?.phone} email={b.client?.email} bookingRef={b.ref} />
          {b.notes && <span className="rounded-[2px] bg-paper px-3 py-2.5 text-sm text-ink-3">{b.notes}</span>}
          <RequestActions
            key={b.id}
            id={b.id}
            status={b.status}
            date={b.date}
            depositStatus={b.deposit_status}
            needsPrice={needsPrice}
            minQuote={minQuote}
          />
        </section>
        <div className="flex min-w-0 flex-[2_1_480px] flex-col gap-6">
          <BookingMoney booking={b} />
          {view?.review && (
            <BookingReview review={view.review} title={t("clientReview")} replySlot={<ReviewReply id={view.review.id} />} />
          )}
          {view && (
            <BookingChat key={b.id} view={{ ...view, viewer: "chef" }} title={b.client?.name ?? td("client")} subtitle={b.client?.email} />
          )}
        </div>
      </div>
    </div>
  );
}
