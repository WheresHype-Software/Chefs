import "server-only";
import type { ServiceType } from "../types";
import { DEMO_COOKING } from "./demo";
import { chefScope } from "./session";
import type { Cooking } from "./types";

export async function getCooking(): Promise<Cooking> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_COOKING;
  const { sb, chef } = scope;
  const [cats, diets, mc, md, ms] = await Promise.all([
    sb.from("cuisine_categories").select("id, name_pt").order("sort_order"),
    sb.from("diets").select("id, name_pt").order("id"),
    sb.from("chef_categories").select("category_id").eq("chef_id", chef.id),
    sb.from("chef_diets").select("diet_id").eq("chef_id", chef.id),
    sb.from("chef_services").select("service").eq("chef_id", chef.id),
  ]);
  return {
    categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name_pt })),
    diets: (diets.data ?? []).map((d) => ({ id: d.id, name: d.name_pt })),
    mine: {
      categories: (mc.data ?? []).map((r) => r.category_id),
      diets: (md.data ?? []).map((r) => r.diet_id),
      services: (ms.data ?? []).map((r) => r.service as ServiceType),
    },
  };
}
