import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { redirectLocalized } from "@/lib/i18n/server";
import { LegalAcceptanceCard } from "@/components/dashboard/LegalAcceptanceCard";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { myAcceptance } from "@/lib/acceptance";
import { getBookings, getChefMoney, getMyChef, getPayouts, getSession, getSetupProgress } from "@/lib/dashboard";
import { dayLabel, euro, isoDay, longDay, rating } from "@/lib/format";

export default async function Overview() {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.home");
  const td = await getTranslations("dashboard");
  const session = await getSession();
  const chef = await getMyChef();
  if (!chef) {
    // Admins without their own chef page belong in the admin area; clients never get here (layout).
    return redirectLocalized(session.role === "admin" ? "/admin" : "/dashboard/comecar");
  }
  // Até o perfil seguir para revisão, o painel é o caminho até lá: quem entra cai no passo onde ficou.
  if (chef.status === "draft" || chef.status === "rejected") return redirectLocalized("/dashboard/comecar");

  const today = isoDay(new Date());
  const in7 = new Date();
  in7.setDate(in7.getDate() + 6);
  const [requests, week, progress, money] = await Promise.all([
    getBookings({ statuses: ["requested"] }),
    getBookings({ from: today, to: isoDay(in7), statuses: ["accepted", "confirmed"] }),
    getSetupProgress(),
    getChefMoney(),
  ]);
  // A new version of the terms or the contract waits here until the chef accepts it.
  const legal = session.demo || !session.userId ? { terms: true, contract: true } : await myAcceptance(session.userId);
  const toAccept = [...(legal.terms ? [] : ["terms" as const]), ...(legal.contract ? [] : ["chef_contract" as const])];
  // Only worth a query once there is money to show.
  const payouts = money ? await getPayouts() : null;
  const byDay = new Map<string, number>();
  week.forEach((b) => byDay.set(b.date, (byDay.get(b.date) ?? 0) + 1));
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestItems = busiest ? week.filter((b) => b.date === busiest[0]) : [];

  return (
    <div className="flex flex-col gap-6">
      {toAccept.length > 0 && (
        <LegalAcceptanceCard
          kinds={toAccept}
          context="dashboard"
          title={toAccept.includes("chef_contract") ? t("contractTitle") : t("termsTitle")}
          intro={toAccept.includes("chef_contract") ? t("contractIntro") : t("termsIntro")}
        />
      )}
      <SetupChecklist chef={chef} progress={progress} />

      <PageHeader meta={longDay(today, locale)} title={t("hello", { name: chef.display_name.split(" ")[0] })} />

      <StatGrid
        items={[
          [t("stats.toAnswer"), String(requests.length)],
          [t("stats.thisWeek"), String(week.length)],
          [t("stats.deliveries"), String(week.filter((b) => b.fulfilment_mode === "delivery").length)],
          [t("stats.rating"), rating(chef.rating_avg, chef.review_count, locale).replace("★ ", "")],
        ]}
      />

      {money && payouts && (
        <section aria-labelledby="dinheiro" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="dinheiro" className="lab m-0 text-muted">
              {t("money.title")}
            </h2>
            <Link href="/dashboard/pagamentos" className="text-sm">
              {t("money.seePayments")}
            </Link>
          </div>
          <StatGrid
            size="md"
            // Only money coming in. A yearly commission total would be the one figure that makes
            // a small percentage feel like a bill, and the chef can see it per booking anyway,
            // on the booking itself and on the document that comes with each payment.
            items={[
              [t("money.owedByUs"), euro(payouts.summary.balance, locale)],
              [t("money.clientsOwe"), euro(money.restOwed, locale)],
              [t("money.paidByUs"), euro(payouts.summary.paidThisYear, locale)],
              [t("money.paidByClients"), euro(money.restPaid, locale)],
            ]}
          />
          {(money.awaitingDeposit > 0 || money.restToConfirm > 0) && (
            <p className="m-0 text-sm text-muted">
              {money.awaitingDeposit > 0 && `${t("money.awaitingDeposit", { count: money.awaitingDeposit })} `}
              {money.restToConfirm > 0 && t("money.restToConfirm", { count: money.restToConfirm })}
            </p>
          )}
        </section>
      )}

      {requests.length > 0 && (
        <section className="box flex flex-col p-6">
          <div className="flex items-baseline justify-between border-b border-line-2 pb-3">
            <h2 className="d m-0 text-2xl">{t("newRequests")}</h2>
            <Link href="/dashboard/pedidos" className="text-sm">
              {t("seeAll")}
            </Link>
          </div>
          {requests.slice(0, 4).map((b) => (
            <Link
              key={b.id}
              href={`/dashboard/pedidos/${b.id}`}
              className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line py-4 text-ink no-underline last:border-b-0"
            >
              <span className="flex flex-col">
                <span className="d text-xl">{b.client?.name ?? td("client")}</span>
                <span className="text-[13px] text-muted">
                  {b.offer_title} · {b.guests} · {dayLabel(b.date, locale)}
                </span>
              </span>
              <span className="lab rounded-[2px] bg-cobalt px-2.5 py-1.5 text-white">{t("reply")}</span>
            </Link>
          ))}
        </section>
      )}

      {busiest && (
        <div className="box flex flex-wrap items-center justify-between gap-4 p-6">
          <span className="flex flex-col gap-1">
            <span className="d text-2xl">{t("busiest", { day: longDay(busiest[0], locale).split(",")[0] })}</span>
            <span className="text-muted">
              {t("busiestServices", {
                count: busiestItems.length,
                list: busiestItems.map((b) => `${b.time_label ?? ""} ${b.offer_title}`.trim()).join(" · "),
              })}
            </span>
          </span>
          <Link href={`/dashboard/logistica?dia=${busiest[0]}`} className="btn">
            {t("seeDayLogistics")}
          </Link>
        </div>
      )}
    </div>
  );
}
