"use server";

import { z } from "zod";
import { fail, failInvalid, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done, NO_CHEF } from "./context";

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

const LOGISTICS_LABELS: Record<string, string> = {
  travel_radius_km: "Raio de deslocação",
  free_distance_km: "Grátis até (km)",
  fee_per_km: "Depois, por km",
  arrival_minutes_before: "Chegada antes do serviço",
  delivery_windows: "Janelas",
  delivery_fee: "Taxa de entrega",
  free_delivery_over: "Grátis acima de",
  kitchen_address: "Morada da cozinha",
};

export async function saveLogistics(
  input: z.infer<typeof LogisticsInput>,
  zones: { name: string; active: boolean }[],
  slots: { label: string; active: boolean }[],
): Promise<Result> {
  const parsed = LogisticsInput.safeParse(input);
  if (!parsed.success) return failInvalid(parsed.error, LOGISTICS_LABELS);
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const id = ctx.chef.id;
  const { error } = await ctx.sb.from("chef_logistics").upsert({ chef_id: id, ...parsed.data });
  if (error) return failWith(error, "saveLogistics", "Não foi possível guardar a logística. Tente de novo.");
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
  if (stepError) return failWith(stepError, "saveLogistics zones", "Parte da logística não foi guardada. Tente de novo.");
  return done();
}
