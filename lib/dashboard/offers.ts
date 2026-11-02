import "server-only";
import { DEMO_OFFERS } from "./demo";
import { chefScope } from "./session";
import type { DashOffer } from "./types";

export async function getOffers(): Promise<DashOffer[]> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_OFFERS;
  const { data } = await scope.sb
    .from("offers")
    .select(
      "id, title, description, fulfilment_mode, price_model, price, unit_label, min_guests, max_guests, lead_time_hours, time_slots, active",
    )
    .eq("chef_id", scope.chef.id)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as DashOffer[];
}
