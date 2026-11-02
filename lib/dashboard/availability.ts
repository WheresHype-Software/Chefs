import "server-only";
import { demoAvailability } from "./demo";
import { chefScope } from "./session";
import type { AvailabilityDay } from "./types";

export async function getAvailability(from: string, to: string): Promise<AvailabilityDay[]> {
  const scope = await chefScope();
  if (scope.demo) return demoAvailability(from, to);
  const { data } = await scope.sb
    .from("availability")
    .select("date, status")
    .eq("chef_id", scope.chef.id)
    .gte("date", from)
    .lte("date", to);
  return (data ?? []) as AvailabilityDay[];
}
