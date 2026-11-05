import "server-only";
import { isoDay } from "../format";
import { getSettings } from "../settings";
import { DEMO_SETUP } from "./demo";
import { chefScope } from "./session";
import type { SetupProgress } from "./types";

/** What a chef still has to do before clients can find and book them. */
export async function getSetupProgress(): Promise<SetupProgress> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_SETUP;
  const { sb, chef } = scope;
  const today = isoDay(new Date());
  const settings = await getSettings();
  const [photos, offers, days, billing] = await Promise.all([
    sb.from("chef_photos").select("kind").eq("chef_id", chef.id),
    sb.from("offers").select("id", { count: "exact", head: true }).eq("chef_id", chef.id).eq("active", true),
    sb
      .from("availability")
      .select("id", { count: "exact", head: true })
      .eq("chef_id", chef.id)
      .eq("status", "available")
      .gte("date", today),
    // Defensive: before the payment migrations are applied this function does not exist, and a
    // dashboard that dies because of a step it cannot show would be a poor trade.
    settings.paymentsEnabled
      ? sb.rpc("chef_payout_readiness", { p_chef: chef.id }).then(
          (r) => r.data as Record<string, unknown> | null,
          () => null,
        )
      : Promise.resolve(null),
  ]);
  const kinds = (photos.data ?? []).map((p) => p.kind as string);
  return {
    profilePhoto: kinds.includes("portrait") || kinds.includes("selfie"),
    dishPhotos: kinds.filter((k) => k === "gallery").length,
    activeOffers: offers.count ?? 0,
    openDays: days.count ?? 0,
    billing:
      !settings.paymentsEnabled || !billing
        ? "off"
        : billing.hasFiscal &&
            billing.hasDac7 &&
            billing.hasIban &&
            Number(billing.agreementVersion ?? 0) >= Number(billing.requiredAgreementVersion ?? 1)
          ? "done"
          : "missing",
  };
}
