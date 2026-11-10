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

/**
 * The weekdays the chef is open every week (0 = Sunday, as Date.getDay()). Empty before migration
 * 20261110000002 adds the column, so the calendar keeps working until then.
 */
export async function getWeeklyDays(): Promise<number[]> {
  const scope = await chefScope();
  if (scope.demo) return [];
  const { data, error } = await scope.sb.from("chefs").select("open_weekdays").eq("id", scope.chef.id).maybeSingle();
  if (error || !data) return [];
  return ((data as { open_weekdays: number[] | null }).open_weekdays ?? []).map(Number);
}
