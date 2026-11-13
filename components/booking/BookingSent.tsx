"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useEffect } from "react";
import { PrivateLink } from "@/components/booking/PrivateLink";
import { DetailList } from "@/components/ui/DetailList";
import { rememberBooking } from "@/lib/recent-bookings";

type Props = {
  booking: { id: string; ref: string; link: string; privateLink: string; emailed: boolean };
  chefFirstName: string;
  chefName: string;
  date: string;
  email: string;
  summary: [string, string][];
  onClose?: () => void;
};

/** Confirmation shown after a request is sent, with the guest's way back to it. */
export function BookingSent({ booking, chefFirstName, chefName, date, email, summary, onClose }: Props) {
  const t = useTranslations("booking.sent");
  useEffect(() => {
    rememberBooking({ id: booking.id, ref: booking.ref, chef: chefName, date });
  }, [booking.id, booking.ref, chefName, date]);

  return (
    <div className="al-in flex flex-col gap-5 py-6">
      <svg className="al-check text-cobalt" width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 33l8 8 16-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="d m-0 text-[34px] leading-[1.04] md:text-[40px]">{t("title", { name: chefFirstName })}</h2>
      <p className="m-0 text-muted">{t("intro", { name: chefFirstName })}</p>
      <DetailList variant="ruled" items={summary} />

      <section aria-label={t("trackLabel")} className="flex flex-col gap-3 rounded-[10px] border border-cobalt/30 bg-cobalt-soft p-4">
        <span className="font-semibold">{t("saveLink")}</span>
        <span className="text-sm text-ink-3">
          {booking.emailed ? t("linkInfoEmailed", { name: chefFirstName, email }) : t("linkInfo", { name: chefFirstName })}
        </span>
        <PrivateLink url={booking.privateLink} title={t("linkTitle", { ref: booking.ref })} />
      </section>

      <Link href={booking.link} className="btn">
        {t("open")}
      </Link>
      {onClose && (
        <button type="button" className="btn btn-o" onClick={onClose}>
          {t("back")}
        </button>
      )}
    </div>
  );
}
