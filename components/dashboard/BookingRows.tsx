import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { LumiSlot } from "@/components/dashboard/LumiCoach";
import { RequestActions } from "@/components/dashboard/RequestActions";
import type { DashBooking } from "@/lib/dashboard";
import { dayLabel, euro, modeLabel, statusLabel } from "@/lib/format";
import { LOCALE_TAG, type Locale } from "@/lib/i18n/routing";
import type { BookingStatus } from "@/lib/types";

function hoursLeft(createdAt: string): number {
  return Math.max(0, Math.round(48 - (Date.now() - new Date(createdAt).getTime()) / 3600_000));
}

const PILL: Record<BookingStatus, string> = {
  requested: "bg-[#fbeeec] text-danger",
  change_proposed: "bg-yolk-soft text-ink",
  accepted: "bg-cobalt-soft text-cobalt-deep",
  confirmed: "bg-cobalt text-white",
  completed: "bg-paper text-ok",
  declined: "bg-paper text-muted",
  cancelled: "bg-paper text-muted",
  expired: "bg-paper text-muted",
};

export async function StatusPill({ status, createdAt }: { status: BookingStatus; createdAt: string }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.requests.row");
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${PILL[status]}`}>
      {status === "requested" ? t("answerIn", { hours: hoursLeft(createdAt) }) : statusLabel(status, locale)}
    </span>
  );
}

/** The day as a calendar leaf, so a list of bookings scans by date. */
function DateLeaf({ date, locale }: { date: string; locale: Locale }) {
  const d = new Date(`${date}T12:00:00`);
  const month = new Intl.DateTimeFormat(LOCALE_TAG[locale], { month: "short" }).format(d);
  return (
    <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[12px] border border-line bg-white">
      <span className="text-[20px] font-extrabold leading-none tabular-nums">{d.getDate()}</span>
      <span className="text-[12px] uppercase text-muted">{month.replace(".", "")}</span>
    </span>
  );
}

/** A booking that needs the chef: who, what and when on top, the next step in a bar below. */
export async function ActiveRow({ b, minQuote = null, lumi = false }: { b: DashBooking; minQuote?: number | null; lumi?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.requests.row");
  const td = await getTranslations("dashboard");
  const href = `/dashboard/pedidos/${b.id}`;
  const needsPrice = b.estimate == null && b.quoted_price == null;
  return (
    <article className="box flex flex-col overflow-hidden">
      <div className="flex gap-4 p-4 md:p-5">
        <DateLeaf date={b.date} locale={locale} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <Link href={href} className="min-w-0 truncate text-[19px] font-bold leading-tight text-ink no-underline hover:text-cobalt">
              {b.client?.name ?? td("client")}
            </Link>
            <StatusPill status={b.status} createdAt={b.created_at} />
          </div>
          <span className="text-[15px] text-ink-3">
            {b.offer_title} · {modeLabel(b.fulfilment_mode, locale)} · {t("guests", { count: b.guests })}
          </span>
          <span className="flex flex-wrap gap-x-2 text-[14px] text-muted tabular-nums">
            <span>
              {dayLabel(b.date, locale)}
              {b.time_label ? ` · ${b.time_label}` : ""}
            </span>
            {b.quoted_price ? (
              <span className="font-semibold text-ink">{t("quote", { amount: euro(b.quoted_price, locale) })}</span>
            ) : b.estimate ? (
              <span className="font-semibold text-ink">{euro(b.estimate, locale)}</span>
            ) : (
              <span className="font-semibold text-danger">{t("needsQuote")}</span>
            )}
            <span>{b.ref}</span>
          </span>
          {b.notes && <span className="mt-1.5 border-l-2 border-line-2 pl-3 text-[14px] text-ink-3">{b.notes}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-line bg-paper px-4 py-3 md:px-5">
        <div className="min-w-0 flex-1" data-lumi={lumi ? "orcamento" : undefined}>
          {lumi && <LumiSlot name="orcamento" />}
          <RequestActions
            id={b.id}
            status={b.status}
            date={b.date}
            depositStatus={b.deposit_status}
            needsPrice={needsPrice}
            minQuote={minQuote}
          />
        </div>
        <Link href={href} className="py-1.5 text-sm font-semibold">
          {t("open")}
        </Link>
      </div>
    </article>
  );
}

/** A finished booking in one quiet line: when, who, what, how much, how it ended. */
export async function HistoryRow({ b }: { b: DashBooking }) {
  const locale = await getLocale();
  const td = await getTranslations("dashboard");
  return (
    <li>
      <Link
        href={`/dashboard/pedidos/${b.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-1 py-3 text-[14px] text-ink no-underline hover:bg-white"
      >
        <span className="w-24 shrink-0 tabular-nums text-muted">{dayLabel(b.date, locale)}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{b.client?.name ?? td("client")}</span>
        <span className="hidden min-w-0 flex-1 truncate text-ink-3 sm:block">{b.offer_title}</span>
        <span className="w-16 shrink-0 text-right tabular-nums text-ink-3">{b.estimate ? euro(b.estimate, locale) : "—"}</span>
        <StatusPill status={b.status} createdAt={b.created_at} />
      </Link>
    </li>
  );
}
