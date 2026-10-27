import { OfferList } from "@/components/dashboard/OfferEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOffers, getSetupProgress } from "@/lib/dashboard";

export default async function Ofertas() {
  const [offers, progress] = await Promise.all([getOffers(), getSetupProgress()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Menus, caixas e encomendas"
        description="Preço fixo, por pessoa ou sob orçamento. Cada oferta diz onde é servida: em casa do cliente, entrega ou levantamento."
      />
      <OfferList offers={offers} openDays={progress.openDays} />
    </div>
  );
}
