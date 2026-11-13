import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import { redirectLocalized } from "@/lib/i18n/server";
import { AgreementCard } from "@/components/dashboard/AgreementCard";
import { BillingForm } from "@/components/dashboard/BillingForm";
import { IbanCard } from "@/components/dashboard/IbanCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTRACT_HIGHLIGHTS, CONTRACT_VERSION, contractText } from "@/lib/contract";
import { getBilling, requireChef } from "@/lib/dashboard";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/faturacao">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "pt" | "en", namespace: "dashboard.meta" });
  return { title: t("billing"), robots: { index: false } };
}

type Step = { label: string; done: boolean; note?: string };

export default async function Faturacao() {
  const t = await getTranslations("dashboard.billing");
  // Sem pagamentos na app não há sinal para receber nem comissão para descontar: a secção sai
  // do menu, e quem lá chegar por um link antigo volta para onde há alguma coisa para ver.
  if (!(await getSettings()).paymentsEnabled) return redirectLocalized("/dashboard");
  const chef = await requireChef();
  const { billing, readiness, settings, acceptedVersion } = await getBilling();
  // What is still missing before a transfer can leave, in the order it makes sense to fix it.
  const list: Step[] = [
    { label: t("steps.fiscal"), done: readiness.hasFiscal },
    { label: t("steps.dac7"), done: readiness.hasDac7 },
    { label: t("steps.iban"), done: readiness.hasIban, note: readiness.ibanPending ? t("steps.ibanPending") : undefined },
    {
      label: t("steps.ibanVerified"),
      done: readiness.ibanApproved,
      note: readiness.hasIban && !readiness.ibanApproved ? t("steps.ibanVerifiedNote") : undefined,
    },
    {
      label: t("steps.contract"),
      done: readiness.agreementVersion != null && readiness.agreementVersion >= readiness.requiredAgreementVersion,
    },
  ];
  const missing = list.filter((s) => !s.done).length;

  return (
    <div className="flex flex-col gap-[26px]">
      <PageHeader title={t("title")} description={t("description")} />

      <section className="box flex flex-col gap-3.5 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">{t("missing", { count: missing })}</h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {list.map((s) => (
            <li key={s.label} className="flex items-baseline gap-2.5 border-b border-line pb-2.5 text-sm last:border-b-0 last:pb-0">
              <span aria-hidden="true" className={s.done ? "text-ok" : "text-muted"}>
                {s.done ? "✓" : "○"}
              </span>
              <span className={s.done ? "text-muted" : ""}>{s.label}</span>
              {s.note && <span className="text-sm text-muted">· {s.note}</span>}
            </li>
          ))}
        </ul>
        {readiness.onHold && <p className="m-0 border-l-2 border-line-2 pl-3 text-sm">{t("onHold")}</p>}
        {readiness.blocked && (
          <p className="m-0 border-l-2 border-line-2 pl-3 text-sm">
            {readiness.blockedReason ? t("blockedWithReason", { reason: readiness.blockedReason }) : t("blocked")}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[3_1_460px] flex-col gap-6">
          <BillingForm billing={billing} />
          <IbanCard billing={billing} holderSuggestion={billing?.legal_name ?? chef.display_name} />
        </div>
        <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-6">
          <AgreementCard
            text={contractText()}
            version={CONTRACT_VERSION}
            acceptedVersion={acceptedVersion}
            highlights={CONTRACT_HIGHLIGHTS}
            commissionPercent={settings.commissionPercent}
            commissionMin={settings.commissionMin}
          />
        </div>
      </div>
    </div>
  );
}
