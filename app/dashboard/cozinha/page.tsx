import { CookingForm } from "@/components/dashboard/CookingForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCooking, getOffers, requireChef } from "@/lib/dashboard";
import { euro, rating, tierLabel } from "@/lib/format";

export default async function Cozinha() {
  const chef = await requireChef();
  const [cooking, offers] = await Promise.all([getCooking(), getOffers()]);
  const prices = offers.filter((o) => o.active && o.price != null).map((o) => Number(o.price));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Perfil" title="Cozinha e serviços" />
      <CookingForm
        {...cooking}
        preview={{
          name: chef.display_name,
          tier: tierLabel(chef.tier),
          area: chef.area_name ?? "",
          rating: rating(chef.rating_avg, chef.review_count),
          from: prices.length ? euro(Math.min(...prices)) : "orçamento",
        }}
      />
    </div>
  );
}
