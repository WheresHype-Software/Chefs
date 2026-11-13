import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { redirectLocalized } from "@/lib/i18n/server";
import { AgreementCard } from "@/components/dashboard/AgreementCard";
import { BillingForm } from "@/components/dashboard/BillingForm";
import { IbanCard } from "@/components/dashboard/IbanCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTRACT_HIGHLIGHTS, CONTRACT_VERSION, contractText } from "@/lib/contract";
import { getBilling, requireChef } from "@/lib/dashboard";
import type { PayoutReadiness } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Faturação e pagamentos", robots: { index: false } };

type Step = { label: string; done: boolean; note?: string };

/** What is still missing before a transfer can leave, in the order it makes sense to fix it. */
function steps(r: PayoutReadiness): Step[] {
  return [
    { label: "Dados fiscais completos", done: r.hasFiscal },
    { label: "Dados exigidos por lei (DAC7)", done: r.hasDac7 },
    {
      label: "IBAN indicado",
      done: r.hasIban,
      note: r.ibanPending ? "Há uma alteração por confirmar no teu email." : undefined,
    },
    {
      label: "IBAN verificado pela equipa",
      done: r.ibanApproved,
      note: r.hasIban && !r.ibanApproved ? "Verificamos contas novas antes do primeiro pagamento." : undefined,
    },
    {
      label: "Contrato aceite",
      done: r.agreementVersion != null && r.agreementVersion >= r.requiredAgreementVersion,
    },
  ];
}

export default async function Faturacao() {
  // Sem pagamentos na app não há sinal para receber nem comissão para descontar: a secção sai
  // do menu, e quem lá chegar por um link antigo volta para onde há alguma coisa para ver.
  if (!(await getSettings()).paymentsEnabled) return redirectLocalized("/dashboard");
  const chef = await requireChef();
  const { billing, readiness, settings, acceptedVersion } = await getBilling();
  const list = steps(readiness);
  const missing = list.filter((s) => !s.done).length;

  return (
    <div className="flex flex-col gap-[26px]">
      <PageHeader
        title="Faturação e pagamentos"
        description="O cliente paga o sinal na app. Depois do serviço concluído, transferimos-te esse sinal menos a nossa comissão, com um documento que explica a conta."
      />

      <section className="box flex flex-col gap-3.5 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">
          {missing === 0 ? "Está tudo pronto para receberes" : missing === 1 ? "Falta uma coisa" : `Faltam ${missing} coisas`}
        </h2>
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
        {readiness.onHold && (
          <p className="m-0 border-l-2 border-line-2 pl-3 text-sm">
            Os pagamentos estão retidos por segurança depois da alteração do IBAN. Voltam ao normal automaticamente.
          </p>
        )}
        {readiness.blocked && (
          <p className="m-0 border-l-2 border-line-2 pl-3 text-sm">
            Os teus pagamentos estão suspensos{readiness.blockedReason ? ` (${readiness.blockedReason})` : ""}. Fala connosco para
            resolvermos.
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
