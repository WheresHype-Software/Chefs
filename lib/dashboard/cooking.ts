import "server-only";
import type { ServiceType } from "../types";
import { DEMO_COOKING } from "./demo";
import { chefScope, getSession } from "./session";
import type { Cooking } from "./types";

export async function getCooking(): Promise<Cooking> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_COOKING;
  const { sb, chef } = scope;
  const { userId } = await getSession();
  const [cats, diets, mc, md, ms] = await Promise.all([
    // created_by arrives with migration 20261110000001; before it, the plain list still works.
    sb
      .from("cuisine_categories")
      .select("id, name_pt, created_by")
      .order("sort_order")
      .then((r) => (r.error ? sb.from("cuisine_categories").select("id, name_pt").order("sort_order") : r)),
    sb.from("diets").select("id, name_pt").order("id"),
    sb.from("chef_categories").select("category_id").eq("chef_id", chef.id),
    sb.from("chef_diets").select("diet_id").eq("chef_id", chef.id),
    sb.from("chef_services").select("service").eq("chef_id", chef.id),
  ]);
  return {
    // The curated list, plus cuisines this chef added or picked; not every other chef's additions.
    categories: ((cats.data ?? []) as { id: number; name_pt: string; created_by?: string | null }[])
      .filter((c) => !c.created_by || c.created_by === userId || (mc.data ?? []).some((m) => m.category_id === c.id))
      .map((c) => ({ id: c.id, name: c.name_pt })),
    diets: (diets.data ?? []).map((d) => ({ id: d.id, name: d.name_pt })),
    mine: {
      categories: (mc.data ?? []).map((r) => r.category_id),
      diets: (md.data ?? []).map((r) => r.diet_id),
      services: (ms.data ?? []).map((r) => r.service as ServiceType),
    },
  };
}
