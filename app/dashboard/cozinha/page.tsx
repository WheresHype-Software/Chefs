import { CookingForm } from "@/components/dashboard/CookingForm";
import { getCooking, getOffers, requireChef } from "@/lib/dashboard";
import { euro, rating, tierLabel } from "@/lib/format";

export default async function Cozinha() {
  const chef = await requireChef();
  const [cooking, offers] = await Promise.all([getCooking(), getOffers()]);
  const prices = offers.filter((o) => o.active && o.price != null).map((o) => Number(o.price));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="lab text-muted">Perfil</span>
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">Cozinha e serviços</h1>
      </div>
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
