import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import { redirectLocalized } from "@/lib/i18n/server";
import { Link } from "@/lib/i18n/navigation";
import { PayoutDocuments } from "@/components/dashboard/PayoutDocuments";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { getBilling, getPayouts } from "@/lib/dashboard";
import { euro, shortStamp } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/pagamentos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "pt" | "en", namespace: "dashboard.meta" });
  return { title: t("payments"), robots: { index: false } };
}

export default async function Pagamentos() {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.payments");
  const STATUS_LABEL: Record<string, string> = {
    due: t("status.due"),
    held: t("status.held"),
    batched: t("status.batched"),
    paid: t("status.paid"),
    cancelled: t("status.cancelled"),
  };
  // Sem pagamentos na app não há sinal para receber nem comissão para descontar: a secção sai
  // do menu, e quem lá chegar por um link antigo volta para onde há alguma coisa para ver.
  if (!(await getSettings()).paymentsEnabled) return redirectLocalized("/dashboard");
  const [{ summary, payouts, documents }, { readiness }] = await Promise.all([getPayouts(), getBilling()]);
  const ready =
    readiness.hasFiscal &&
    readiness.hasDac7 &&
    readiness.hasIban &&
    readiness.ibanApproved &&
    (readiness.agreementVersion ?? 0) >= readiness.requiredAgreementVersion;

  return (
    <div className="flex flex-col gap-[26px]">
      <PageHeader title={t("title")} description={t("description")} />

      {!ready && (
        <section className="box flex flex-col gap-2.5 border-2 border-cobalt p-[22px]">
          <h2 className="d m-0 text-[22px] font-normal">{t("missingTitle")}</h2>
          <p className="m-0 text-sm text-muted">{t("missingText")}</p>
          <Link href="/dashboard/faturacao" className="btn btn-sm self-start">
            {t("complete")}
          </Link>
        </section>
      )}

      <StatGrid
        items={[
          [t("stats.balance"), euro(summary.balance, locale)],
          [t("stats.due"), euro(summary.due, locale)],
          [t("stats.waiting"), euro(summary.waiting, locale)],
          [t("stats.paidThisYear"), euro(summary.paidThisYear, locale)],
        ]}
      />

      <section className="box flex flex-col gap-3.5 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">{t("movements")}</h2>
        {payouts.length === 0 ? (
          <p className="m-0 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0">
                <span className="num text-lg font-semibold">{euro(p.amount, locale)}</span>
                <span className="text-sm">{p.booking ? `${p.booking.offer_title} · ${p.booking.ref}` : (p.reason ?? t("adjustment"))}</span>
                <span className="ml-auto flex flex-col items-end">
                  <span className="lab text-muted">{STATUS_LABEL[p.status] ?? p.status}</span>
                  <span className="text-[13px] text-muted">
                    {p.status === "paid" && p.paid_at ? shortStamp(p.paid_at, locale) : t("expected", { date: shortStamp(p.due_at, locale) })}
                  </span>
                </span>
                {p.hold_reason && <span className="w-full text-sm text-muted">{t("held", { reason: p.hold_reason })}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <PayoutDocuments documents={documents} />
    </div>
  );
}
