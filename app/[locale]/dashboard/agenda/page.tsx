import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AgendaGrid } from "@/components/dashboard/AgendaGrid";
import { LumiCoach, LumiRestore } from "@/components/dashboard/LumiCoach";
import { getAvailability, getBookings, getSetupProgress, getWeeklyDays, lumiOn } from "@/lib/dashboard";
import { isoDay, monthLabel } from "@/lib/format";
import { agendaTips } from "@/lib/lumi-tips";

export default async function Agenda({ searchParams }: PageProps<"/[locale]/dashboard/agenda">) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.agenda");
  const { mes } = await searchParams;
  const now = new Date();
  const [y, m] =
    typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const year = y!;
  const month = m! - 1;
  const from = isoDay(new Date(year, month, 1));
  const to = isoDay(new Date(year, month + 1, 0));
  const [avail, bookings, progress, lumi, weekly] = await Promise.all([
    getAvailability(from, to),
    getBookings({ from, to, statuses: ["accepted", "confirmed"] }),
    getSetupProgress(),
    lumiOn(),
    getWeeklyDays(),
  ]);
  const tips = agendaTips(progress.openDays, locale);
  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`?mes=${shift(-1)}`} className="ctl no-underline" aria-label={t("prevMonth")}>
              ‹
            </Link>
            <span className="d min-w-44 text-center text-xl italic">{monthLabel(year, month, locale)}</span>
            <Link href={`?mes=${shift(1)}`} className="ctl no-underline" aria-label={t("nextMonth")}>
              ›
            </Link>
          </div>
        }
      />
      {progress.openDays === 0 && (
        <div role="status" className="flex flex-col gap-1.5 rounded-[10px] border border-cobalt/30 bg-cobalt-soft p-5">
          <span className="d text-xl">{t("noDaysTitle")}</span>
          <span className="text-[15px] text-ink-3">
            {t("noDaysText")}
            {progress.activeOffers === 0 && ` ${t("noOffersToo")}`}
          </span>
        </div>
      )}
      <AgendaGrid
        key={from}
        year={year}
        month={month}
        initial={Object.fromEntries(avail.map((a) => [a.date, a.status]))}
        weekly={weekly}
        booked={bookings.map((b) => b.date)}
      />
      {lumi === "on" && <LumiCoach key={tips.start} tips={tips.tips} start={tips.start} inline followScroll />}
      {lumi === "off" && <LumiRestore />}
    </div>
  );
}
