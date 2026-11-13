import { useLocale, useTranslations } from "next-intl";
import { BookingForm } from "@/components/booking/BookingForm";
import { ICONS } from "@/components/chef/icons";
import type { MonthCalendarData } from "@/hooks/useMonthCalendar";
import { titledFirst } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import { instagramHandle } from "@/lib/instagram";
import type { ChefProfile } from "@/lib/types";

type Props = { chef: ChefProfile; initialCalendar?: MonthCalendarData; initialOfferId?: string };

/** "Pedir reserva": how a request works, then the booking form (or a note while there are no offers). */
export function ChefBookingAside({ chef, initialCalendar, initialOfferId }: Props) {
  const t = useTranslations("chef.booking");
  const locale = useLocale() as Locale;
  const first = titledFirst(chef, locale);
  const bookable = chef.offers.length > 0;
  return (
    <aside id="reservar" className="box box-border flex min-w-0 flex-[1_1_360px] scroll-mt-20 flex-col gap-4 p-5 md:p-[26px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line-2 pb-3">
        <h2 className="d m-0 text-[26px] md:text-[28px]">{t("title")}</h2>
        <span className="text-[13px] text-muted">{chef.responseHours ? t("responds", { hours: chef.responseHours }) : ""}</span>
      </div>
      {bookable && (
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[14px] text-ink-3">
          {[t("noAccount"), t("noPayment"), t("answer")].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="text-cobalt [&_svg]:h-4 [&_svg]:w-4">{ICONS.check}</span>
              {item}
            </li>
          ))}
        </ul>
      )}
      {bookable ? (
        <BookingForm
          key={`${chef.id}:${initialOfferId ?? ""}`}
          chef={chef}
          initialCalendar={initialCalendar}
          initialOfferId={initialOfferId}
        />
      ) : (
        <p className="m-0 text-muted">
          {instagramHandle(chef.socials.instagram) ? t("preparingInstagram", { name: first }) : t("preparing", { name: first })}
        </p>
      )}
      <a href="#condicoes" className="text-[13px] text-muted">
        {t("termsLink")}
      </a>
    </aside>
  );
}
