import "server-only";
import { isoDay } from "../format";
import { DEMO_SETUP } from "./demo";
import { chefScope } from "./session";
import type { SetupProgress } from "./types";

/** What a chef still has to do before clients can find and book them. */
export async function getSetupProgress(): Promise<SetupProgress> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_SETUP;
  const { sb, chef } = scope;
  const today = isoDay(new Date());
  const [photos, offers, days] = await Promise.all([
    sb.from("chef_photos").select("kind").eq("chef_id", chef.id),
    sb.from("offers").select("id", { count: "exact", head: true }).eq("chef_id", chef.id).eq("active", true),
    sb
      .from("availability")
      .select("id", { count: "exact", head: true })
      .eq("chef_id", chef.id)
      .eq("status", "available")
      .gte("date", today),
  ]);
  const kinds = (photos.data ?? []).map((p) => p.kind as string);
  return {
    profilePhoto: kinds.includes("portrait") || kinds.includes("selfie"),
    dishPhotos: kinds.filter((k) => k === "gallery").length,
    activeOffers: offers.count ?? 0,
    openDays: days.count ?? 0,
  };
}
