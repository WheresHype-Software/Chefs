import { ChefSection } from "@/components/chef/ChefSection";
import { CANCELLATION_LABEL } from "@/lib/data";
import { titledFirst } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

/** This chef's rules for money and cancellation, in plain words, right after the menus. */
export function ChefTerms({ chef }: { chef: ChefProfile }) {
  const first = titledFirst(chef);
  const rows = [
    ["Quando paga", `Nada ao enviar o pedido. Só depois de ${first} aceitar, diretamente a ${first}.`],
    chef.paymentMethods.length > 0 && ["Como paga", chef.paymentMethods.join(" · ")],
    chef.depositPercent && ["Sinal", `${chef.depositPercent} % para confirmar a data; o resto como combinarem.`],
    chef.cancellation && ["Cancelamento", chef.cancellation.text ?? CANCELLATION_LABEL[chef.cancellation.preset] ?? "Política do chef"],
  ].filter((r): r is [string, string] => Array.isArray(r));
  return (
    <ChefSection
      id="condicoes"
      icon="wallet"
      title="Pagamento e cancelamento"
      subtitle={`As regras de ${first}, para saber antes de pedir.`}
    >
      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 rounded-[10px] bg-paper p-4">
            <dt className="text-[14px] font-semibold text-ink">{label}</dt>
            <dd className="m-0 text-[15px] text-ink-3">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-[13px] text-muted">O serviço e o pagamento são combinados diretamente com o chef.</p>
    </ChefSection>
  );
}
