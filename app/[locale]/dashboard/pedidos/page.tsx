import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ActiveRow, HistoryRow } from "@/components/dashboard/BookingRows";
import { LumiCoach } from "@/components/dashboard/LumiCoach";
import { PageHeader } from "@/components/ui/PageHeader";
import { getBookings, lumiOn, quoteMinimum, type DashBooking } from "@/lib/dashboard";
import { isoDay } from "@/lib/format";
import { quoteTip } from "@/lib/lumi-tips";

type GroupProps = { title: string; hint?: string; items: DashBooking[]; empty?: ReactNode; minQuote?: number | null; lumiFor?: string };

function Group({ title, hint, items, empty, minQuote = null, lumiFor }: GroupProps) {
  if (!items.length && !empty) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-2 pb-2.5">
        <h2 className="m-0 text-[17px] font-bold">
          {title} <span className="font-normal text-muted">· {items.length}</span>
        </h2>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </div>
      {items.length === 0 ? (
        <p className="m-0 text-muted">{empty}</p>
      ) : (
        items.map((b) => <ActiveRow key={b.id} b={b} minQuote={minQuote} lumi={b.id === lumiFor} />)
      )}
    </section>
  );
}

/**
 * Requests in the order a chef acts on them: to answer, to complete (past service days), coming
 * up. Finished bookings fold into a quiet, collapsed history so they never crowd the work.
 */
export default async function Pedidos() {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.requests");
  const now = new Date();
  const today = isoDay(now);
  const yesterday = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const [requests, toComplete, upcoming, past] = await Promise.all([
    getBookings({ statuses: ["requested", "change_proposed"] }),
    getBookings({ to: yesterday, statuses: ["accepted", "confirmed"] }),
    getBookings({ from: today, statuses: ["accepted", "confirmed"] }),
    getBookings({ statuses: ["completed", "declined", "cancelled", "expired"] }),
  ]);
  const history = [...past].sort((a, b) => b.date.localeCompare(a.date));
  const [minQuote, lumi] = await Promise.all([quoteMinimum(), lumiOn()]);
  // The first request still waiting for a price: Lumi explains it there.
  const unpriced = requests.find((b) => b.status === "requested" && b.estimate == null && b.quoted_price == null);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title")}
        description={t("summary", { toAnswer: requests.length, count: upcoming.length })}
      />

      <Group
        title={t("toAnswer")}
        hint={t("toAnswerHint")}
        items={requests}
        empty={t("toAnswerEmpty")}
        minQuote={minQuote}
        lumiFor={lumi === "on" ? unpriced?.id : undefined}
      />
      <Group title={t("toComplete")} hint={t("toCompleteHint")} items={toComplete} />
      <Group title={t("upcoming")} items={upcoming} empty={t("upcomingEmpty")} />

      {lumi === "on" && unpriced && <LumiCoach inline tips={[quoteTip(locale)]} />}

      {history.length > 0 && (
        <details className="group rounded-[12px] border border-line bg-paper">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="text-[16px] font-bold">
              {t("history")} <span className="font-normal text-muted">· {history.length}</span>
            </span>
            <span className="text-[14px] text-muted">
              <span className="group-open:hidden">{t("showHistory")}</span>
              <span className="hidden group-open:inline">{t("hideHistory")}</span>
            </span>
          </summary>
          <ul className="m-0 list-none border-t border-line px-3 pb-2 pt-1">
            {history.map((b) => (
              <HistoryRow key={b.id} b={b} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
