import "server-only";
import { DEMO_LOGISTICS } from "./demo";
import { chefScope } from "./session";
import type { Logistics, LogisticsSetup } from "./types";

export async function getLogistics(): Promise<LogisticsSetup> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_LOGISTICS;
  const { sb, chef } = scope;
  const [l, z, p] = await Promise.all([
    sb.from("chef_logistics").select("*").eq("chef_id", chef.id).maybeSingle(),
    sb.from("delivery_zones").select("id, name, active").eq("chef_id", chef.id).order("name"),
    sb.from("pickup_slots").select("id, label, active").eq("chef_id", chef.id).order("label"),
  ]);
  return {
    logistics: (l.data as Logistics) ?? {
      ...DEMO_LOGISTICS.logistics,
      kitchen_address: null,
      delivery_enabled: false,
      pickup_enabled: false,
    },
    zones: z.data ?? [],
    slots: p.data ?? [],
  };
}
