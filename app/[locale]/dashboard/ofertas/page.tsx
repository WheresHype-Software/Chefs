import { LumiCoach, LumiRestore } from "@/components/dashboard/LumiCoach";
import { OfferList } from "@/components/dashboard/OfferEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOffers, getSetupProgress, lumiOn } from "@/lib/dashboard";
import { offerTips } from "@/lib/lumi-tips";

export default async function Ofertas() {
  const [offers, progress, lumi] = await Promise.all([getOffers(), getSetupProgress(), lumiOn()]);
  const tips = offerTips(progress.activeOffers);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Menus, caixas e encomendas"
        description="Preço fixo, por pessoa ou sob orçamento. Cada oferta diz onde é servida: em casa do cliente, entrega ou levantamento."
      />
      <OfferList offers={offers} openDays={progress.openDays} />
      {lumi === "on" && <LumiCoach key={progress.activeOffers} tips={tips.tips} start={tips.start} inline />}
      {lumi === "off" && <LumiRestore />}
    </div>
  );
}
