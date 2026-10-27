import { OfferList } from "@/components/dashboard/OfferEditor";
import { getOffers } from "@/lib/dashboard";

export default async function Ofertas() {
  const offers = await getOffers();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="lab text-muted">Ofertas</span>
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">Menus, caixas e encomendas</h1>
        <p className="m-0 max-w-[600px] text-muted">Preço fixo, por pessoa ou sob orçamento. Cada oferta diz onde é servida: em casa do cliente, entrega ou levantamento.</p>
      </div>
      <OfferList offers={offers} />
    </div>
  );
}
