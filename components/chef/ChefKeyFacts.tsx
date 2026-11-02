import { fromPrice, SERVICE_LABEL } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

/** The answers people look for first, side by side under the name: price, where, what, how fast, how to pay. */
export function ChefKeyFacts({ chef }: { chef: ChefProfile }) {
  const price = fromPrice(chef.offers);
  const facts = [
    ["Preço", chef.offers.length ? (price === "orçamento" ? "Sob orçamento" : `desde ${price}`) : "Menus em breve"],
    ["Zona", `${chef.area} · até ${chef.radiusKm} km`],
    ["Serviços", chef.services.map((s) => SERVICE_LABEL[s]).join(", ") || "—"],
    chef.responseHours && ["Responde", `em ~${chef.responseHours} h`],
    chef.paymentMethods.length > 0 && ["Pagamento", chef.paymentMethods.join(" · ")],
  ].filter((f): f is [string, string] => Array.isArray(f));
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 rounded-[10px] border border-line bg-paper p-4 md:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] md:p-5">
      {facts.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-[13px] text-muted">{label}</dt>
          <dd className="m-0 text-[15px] font-semibold [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
