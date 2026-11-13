import { useLocale, useTranslations } from "next-intl";
import { ChefSection } from "@/components/chef/ChefSection";
import { paymentKey, policyKey } from "@/components/chef/labels";
import { titledFirst } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import type { ChefProfile } from "@/lib/types";

/** This chef's rules for money and cancellation, in plain words, right after the menus. */
export function ChefTerms({ chef, paymentsOn = false }: { chef: ChefProfile; paymentsOn?: boolean }) {
  const t = useTranslations("chef.terms");
  const locale = useLocale() as Locale;
  const first = titledFirst(chef, locale);
  const pk = chef.cancellation ? policyKey(chef.cancellation.preset) : null;
  const cancellation = chef.cancellation ? chef.cancellation.text ?? (pk ? t(`policy.${pk}`) : t("policy.custom")) : null;
  const rows = [
    [t("when"), paymentsOn ? t("whenApp", { name: first }) : t("whenDirect", { name: first })],
    chef.paymentMethods.length > 0 && [
      t("rest"),
      chef.paymentMethods
        .map((m) => {
          const mk = paymentKey(m);
          return mk ? t(`payment.${mk}`) : m;
        })
        .join(" · "),
    ],
    chef.depositPercent && [
      t("deposit"),
      paymentsOn ? t("depositApp", { percent: chef.depositPercent }) : t("depositDirect", { percent: chef.depositPercent }),
    ],
    cancellation && [t("cancellation"), cancellation],
  ].filter((r): r is [string, string] => Array.isArray(r));
  return (
    <ChefSection id="condicoes" icon="wallet" title={t("title")} subtitle={t("subtitle", { name: first })}>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 rounded-[10px] bg-paper p-4">
            <dt className="text-[14px] font-semibold text-ink">{label}</dt>
            <dd className="m-0 text-[15px] text-ink-3">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-[13px] text-muted">{paymentsOn ? t("footApp") : t("footDirect")}</p>
    </ChefSection>
  );
}
