"use server";

import { z } from "zod";
import { requestTranslator } from "@/lib/i18n/server";
import { fail, failInvalid, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done } from "./context";

const LogisticsInput = z.object({
  home_enabled: z.boolean(),
  travel_radius_km: z.number().min(1).max(100),
  free_distance_km: z.number().min(0).max(100),
  fee_per_km: z.number().min(0).max(10),
  arrival_minutes_before: z.number().int().min(0).max(600),
  delivery_enabled: z.boolean(),
  delivery_windows: z.array(z.string().max(40)).max(10),
  delivery_fee: z.number().min(0).max(500).nullable(),
  free_delivery_over: z.number().min(0).max(10000).nullable(),
  delivered_by: z.enum(["chef", "courier"]),
  pickup_enabled: z.boolean(),
  kitchen_address: z.string().trim().max(300).nullable(),
});

export async function saveLogistics(
  input: z.infer<typeof LogisticsInput>,
  zones: { name: string; active: boolean }[],
  slots: { label: string; active: boolean }[],
): Promise<Result> {
  const t = await requestTranslator("errors");
  const parsed = LogisticsInput.safeParse(input);
  if (!parsed.success) {
    const fields = [
      "travel_radius_km",
      "free_distance_km",
      "fee_per_km",
      "arrival_minutes_before",
      "delivery_windows",
      "delivery_fee",
      "free_delivery_over",
      "kitchen_address",
    ] as const;
    const labels = Object.fromEntries(fields.map((f) => [f, t(`dashboard.logistics.fields.${f}`)]));
    return failInvalid(parsed.error, t, labels);
  }
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const id = ctx.chef.id;
  const { error } = await ctx.sb.from("chef_logistics").upsert({ chef_id: id, ...parsed.data });
  if (error) return failWith(error, "saveLogistics", t("dashboard.logistics.saveFailed"));
  // Travel radius also drives how far from the chef clients can find them.
  const steps = [
    await ctx.sb.from("chefs").update({ service_radius_km: parsed.data.travel_radius_km }).eq("id", id),
    await ctx.sb.from("delivery_zones").delete().eq("chef_id", id),
    await ctx.sb.from("pickup_slots").delete().eq("chef_id", id),
    zones.length
      ? await ctx.sb
          .from("delivery_zones")
          .insert(zones.slice(0, 40).map((z) => ({ chef_id: id, name: z.name.slice(0, 80), active: z.active })))
      : null,
    slots.length
      ? await ctx.sb
          .from("pickup_slots")
          .insert(slots.slice(0, 20).map((s) => ({ chef_id: id, label: s.label.slice(0, 40), active: s.active })))
      : null,
  ];
  const stepError = steps.find((r) => r?.error)?.error;
  if (stepError) return failWith(stepError, "saveLogistics zones", t("dashboard.logistics.partialSave"));
  return done();
}
