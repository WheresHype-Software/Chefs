"use server";

import { z } from "zod";
import { requestTranslator } from "@/lib/i18n/server";
import { fail, failInvalid, failWith, ok, type ActionResult as Result } from "@/lib/result";
import type { FulfilmentMode, ServiceType } from "@/lib/types";
import { chefContext, done } from "./context";

const OfferInput = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  fulfilment_mode: z.enum(["home", "delivery", "pickup"]),
  price_model: z.enum(["fixed", "per_person", "quote"]),
  price: z.number().min(0).max(100000).nullable(),
  unit_label: z.string().trim().min(1).max(30),
  min_guests: z.number().int().min(1).max(500),
  max_guests: z.number().int().min(1).max(500).nullable(),
  lead_time_hours: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  time_slots: z.array(z.string().trim().min(1).max(40)).max(12),
  active: z.boolean(),
});

/** The service an offer appears under in search, by where it happens. */
const SERVICE: Record<FulfilmentMode, ServiceType> = { home: "home", delivery: "delivery", pickup: "pickup" };

export async function saveOffer(input: z.infer<typeof OfferInput>): Promise<Result> {
  const t = await requestTranslator("errors");
  const parsed = OfferInput.safeParse(input);
  if (!parsed.success) {
    const fields = ["title", "description", "price", "unit_label", "min_guests", "max_guests", "lead_time_hours", "time_slots"] as const;
    const labels = Object.fromEntries(fields.map((f) => [f, t(`dashboard.offers.fields.${f}`)]));
    return failInvalid(parsed.error, t, labels);
  }
  const o = parsed.data;
  if (o.price_model !== "quote" && o.price == null) return fail(t("dashboard.offers.priceRequired"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const row = {
    ...o,
    id: undefined,
    chef_id: ctx.chef.id,
    service_types: [SERVICE[o.fulfilment_mode]],
    price: o.price_model === "quote" ? null : o.price,
  };
  const { error } = o.id ? await ctx.sb.from("offers").update(row).eq("id", o.id) : await ctx.sb.from("offers").insert(row);
  return error ? failWith(error, "saveOffer", t("dashboard.offers.saveFailed")) : done();
}

export async function deleteOffer(id: string): Promise<Result> {
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const { error } = await ctx.sb.from("offers").delete().eq("id", id);
  return error ? failWith(error, "deleteOffer", t("dashboard.offers.deleteFailed")) : done();
}
