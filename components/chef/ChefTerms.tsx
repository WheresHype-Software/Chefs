import { CANCELLATION_LABEL } from "@/lib/data";
import { firstName } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

/** Money and cancellation in plain words, so nobody has to dig through the booking form for them. */
export function ChefTerms({ chef }: { chef: ChefProfile }) {
  const first = firstName(chef.name);
  const rows = [
    ["Quando paga", `Nada ao enviar o pedido. Só depois de ${first} aceitar, diretamente a ${first}.`],
    chef.paymentMethods.length > 0 && ["Como paga", chef.paymentMethods.join(" · ")],
    chef.depositPercent && ["Sinal", `${chef.depositPercent} % para confirmar a data; o resto como combinarem.`],
    chef.cancellation && ["Cancelamento", chef.cancellation.text ?? CANCELLATION_LABEL[chef.cancellation.preset] ?? "Política do chef"],
  ].filter((r): r is [string, string] => Array.isArray(r));
  return (
    <section id="condicoes" aria-labelledby="condicoes-title" className="flex scroll-mt-32 flex-col gap-[18px]">
      <h2 id="condicoes-title" className="d m-0 text-[32px]">
        Pagamento e cancelamento
      </h2>
      <dl className="m-0 border-t border-line-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-line py-3.5 sm:grid-cols-[160px_1fr] sm:gap-6">
            <dt className="text-[15px] font-semibold">{label}</dt>
            <dd className="m-0 text-[15px] text-ink-3">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-[13px] text-muted">O serviço e o pagamento são combinados diretamente com o chef.</p>
    </section>
  );
}
