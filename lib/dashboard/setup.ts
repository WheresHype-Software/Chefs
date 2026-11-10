import "server-only";
import { cache } from "react";
import { isoDay } from "../format";
import { getSettings } from "../settings";
import { DEMO_SETUP } from "./demo";
import { chefScope } from "./session";
import type { SetupProgress } from "./types";

/** What a chef still has to do before clients can find and book them. */
export const getSetupProgress = cache(async (): Promise<SetupProgress> => {
  const scope = await chefScope();
  if (scope.demo) return DEMO_SETUP;
  const { sb, chef } = scope;
  const today = isoDay(new Date());
  const settings = await getSettings();
  const [photos, offers, days, weekly, billing] = await Promise.all([
    sb.from("chef_photos").select("kind").eq("chef_id", chef.id),
    sb.from("offers").select("id", { count: "exact", head: true }).eq("chef_id", chef.id).eq("active", true),
    sb
      .from("availability")
      .select("id", { count: "exact", head: true })
      .eq("chef_id", chef.id)
      .eq("status", "available")
      .gte("date", today),
    // Weekly days (migration 20261110000002); none before it.
    sb
      .from("chefs")
      .select("open_weekdays")
      .eq("id", chef.id)
      .maybeSingle()
      .then((r) => (r.error ? [] : (((r.data as { open_weekdays: number[] | null } | null)?.open_weekdays ?? []) as number[]))),
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
    // Explicit open days ahead, plus the weekly ones over the next four weeks.
    openDays: (days.count ?? 0) + weekly.length * 4,
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
});
