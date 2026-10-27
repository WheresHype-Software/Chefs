"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMyChef, getSession } from "@/lib/dashboard";
import { publicEnv } from "@/lib/env";
import { fail, ok, type ActionResult as Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import type { ServiceType } from "@/lib/types";

async function chefContext() {
  const session = await getSession();
  const chef = await getMyChef();
  if (session.demo) return { demo: true as const, chef, sb: null };
  return { demo: false as const, chef, sb: await createClient() };
}

function done(path = "/dashboard"): Result {
  revalidatePath(path, "layout");
  return ok();
}

// ---------------------------------------------------------------------------
// Profile and onboarding
// ---------------------------------------------------------------------------
const ProfileInput = z.object({
  display_name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras, números e hífenes"),
  tier: z.enum(["professional", "home"]),
  headline: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(2000).optional(),
  area_name: z.string().trim().min(2).max(80),
  lat: z.number().optional(),
  lng: z.number().optional(),
  service_radius_km: z.number().min(1).max(100),
  instagram: z.string().trim().max(80).optional(),
  website: z.string().trim().max(200).optional(),
  years_experience: z.number().int().min(0).max(70).optional(),
  deposit_percent: z.number().int().min(0).max(100).optional(),
});

export async function saveProfile(input: z.infer<typeof ProfileInput>): Promise<Result> {
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const p = parsed.data;
  const session = await getSession();
  const row = {
    display_name: p.display_name,
    slug: p.slug,
    tier: p.tier,
    headline: p.headline || null,
    bio: p.bio || null,
    area_name: p.area_name,
    service_radius_km: p.service_radius_km,
    socials: { instagram: p.instagram || undefined, website: p.website || undefined },
    years_experience: p.years_experience ?? null,
    deposit_percent: p.deposit_percent ?? null,
    ...(p.lat != null && p.lng != null ? { base_location: `SRID=4326;POINT(${p.lng} ${p.lat})` } : {}),
  };
  const { error } = ctx.chef
    ? await ctx.sb.from("chefs").update(row).eq("id", ctx.chef.id)
    : await ctx.sb.from("chefs").insert({ ...row, profile_id: session.userId });
  if (error) return fail(error.message.includes("chefs_slug_key") ? "Esse link já está a ser usado." : error.message);
  if (!ctx.chef) {
    // New chef: default policy and logistics rows.
    const chef = await getMyChefFresh();
    if (chef) {
      await ctx.sb.from("cancellation_policies").insert({ chef_id: chef, preset: "moderate" });
      await ctx.sb.from("chef_logistics").insert({ chef_id: chef, travel_radius_km: p.service_radius_km });
    }
  }
  return done();
}

async function getMyChefFresh(): Promise<string | null> {
  const sb = await createClient();
  const s = await getSession();
  const { data } = await sb.from("chefs").select("id").eq("profile_id", s.userId).maybeSingle();
  return data?.id ?? null;
}

export async function addPhoto(url: string, kind: "selfie" | "cover" | "portrait" | "gallery", caption?: string): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo || !ctx.chef) return ok();
  // Only accept files the chef uploaded to their own folder in our bucket.
  const session = await getSession();
  const prefix = `${publicEnv.supabaseUrl}/storage/v1/object/public/chef-photos/${session.userId}/`;
  if (!url.startsWith(prefix) || !["selfie", "cover", "portrait", "gallery"].includes(kind)) {
    return fail("Fotografia inválida.");
  }
  const { error } = await ctx.sb.from("chef_photos").insert({ chef_id: ctx.chef.id, url, kind, caption: caption?.slice(0, 120) ?? null });
  return error ? fail(error.message) : done();
}

export async function submitForReview(): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo || !ctx.chef) return ok();
  const { count } = await ctx.sb
    .from("chef_photos")
    .select("id", { count: "exact", head: true })
    .eq("chef_id", ctx.chef.id)
    .eq("kind", "gallery");
  const { data: selfie } = await ctx.sb.from("chef_photos").select("id").eq("chef_id", ctx.chef.id).eq("kind", "selfie").limit(1);
  if (!selfie?.length) return fail("Falta a sua fotografia.");
  if ((count ?? 0) < 3) return fail("Carregue pelo menos três fotos de pratos.");
  if (!ctx.chef.socials.instagram && !ctx.chef.socials.website) return fail("Indique o Instagram ou o site.");
  const { error } = await ctx.sb.from("chefs").update({ status: "pending" }).eq("id", ctx.chef.id);
  return error ? fail(error.message) : done();
}

// ---------------------------------------------------------------------------
// Cooking categories, services, diets
// ---------------------------------------------------------------------------
export async function saveCooking(categories: number[], diets: number[], services: ServiceType[]): Promise<Result> {
  if (categories.length > 3) return fail("Escolha até três categorias.");
  const ctx = await chefContext();
  if (ctx.demo || !ctx.chef) return ok();
  const id = ctx.chef.id;
  await ctx.sb.from("chef_categories").delete().eq("chef_id", id);
  await ctx.sb.from("chef_diets").delete().eq("chef_id", id);
  await ctx.sb.from("chef_services").delete().eq("chef_id", id);
  const results = await Promise.all([
    categories.length ? ctx.sb.from("chef_categories").insert(categories.map((category_id) => ({ chef_id: id, category_id }))) : null,
    diets.length ? ctx.sb.from("chef_diets").insert(diets.map((diet_id) => ({ chef_id: id, diet_id }))) : null,
    services.length ? ctx.sb.from("chef_services").insert(services.map((service) => ({ chef_id: id, service }))) : null,
  ]);
  const err = results.find((r) => r?.error)?.error;
  return err ? fail(err.message) : done();
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------
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

export async function saveOffer(input: z.infer<typeof OfferInput>): Promise<Result> {
  const parsed = OfferInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const o = parsed.data;
  if (o.price_model !== "quote" && o.price == null) return fail("Indique o preço.");
  const ctx = await chefContext();
  if (ctx.demo || !ctx.chef) return ok();
  const SERVICE: Record<string, ServiceType> = { home: "home", delivery: "delivery", pickup: "pickup" };
  const row = {
    ...o,
    id: undefined,
    chef_id: ctx.chef.id,
    service_types: [SERVICE[o.fulfilment_mode]],
    price: o.price_model === "quote" ? null : o.price,
  };
  const { error } = o.id ? await ctx.sb.from("offers").update(row).eq("id", o.id) : await ctx.sb.from("offers").insert(row);
  return error ? fail(error.message) : done();
}

export async function deleteOffer(id: string): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const { error } = await ctx.sb.from("offers").delete().eq("id", id);
  return error ? fail(error.message) : done();
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------
/** Cycles a day: nothing -> available -> blocked -> nothing. */
export async function cycleDay(date: string): Promise<Result> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Data inválida");
  const ctx = await chefContext();
  if (ctx.demo || !ctx.chef) return ok();
  const { data } = await ctx.sb.from("availability").select("id, status").eq("chef_id", ctx.chef.id).eq("date", date).maybeSingle();
  const res = !data
    ? await ctx.sb.from("availability").insert({ chef_id: ctx.chef.id, date, status: "available" })
    : data.status === "available"
      ? await ctx.sb.from("availability").update({ status: "blocked" }).eq("id", data.id)
      : await ctx.sb.from("availability").delete().eq("id", data.id);
  return res.error ? fail(res.error.message) : done();
}

/** Marks every given weekday of a month as available. */
export async function openWeekdays(year: number, month: number, weekdays: number[]): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo || !ctx.chef) return ok();
  const rows = [];
  const today = new Date().toISOString().slice(0, 10);
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
    const date = new Date(Date.UTC(year, month, d));
    const iso = date.toISOString().slice(0, 10);
    if (iso >= today && weekdays.includes(date.getUTCDay())) rows.push({ chef_id: ctx.chef.id, date: iso, status: "available" });
  }
  const { error } = await ctx.sb.from("availability").upsert(rows, { onConflict: "chef_id,date,start_time", ignoreDuplicates: true });
  return error ? fail(error.message) : done();
}

// ---------------------------------------------------------------------------
// Logistics
// ---------------------------------------------------------------------------
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
  const parsed = LogisticsInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const ctx = await chefContext();
  if (ctx.demo || !ctx.chef) return ok();
  const id = ctx.chef.id;
  const { error } = await ctx.sb.from("chef_logistics").upsert({ chef_id: id, ...parsed.data });
  if (error) return fail(error.message);
  // Travel radius also drives where the chef appears on the map.
  await ctx.sb.from("chefs").update({ service_radius_km: parsed.data.travel_radius_km }).eq("id", id);
  await ctx.sb.from("delivery_zones").delete().eq("chef_id", id);
  await ctx.sb.from("pickup_slots").delete().eq("chef_id", id);
  if (zones.length)
    await ctx.sb
      .from("delivery_zones")
      .insert(zones.slice(0, 40).map((z) => ({ chef_id: id, name: z.name.slice(0, 80), active: z.active })));
  if (slots.length)
    await ctx.sb
      .from("pickup_slots")
      .insert(slots.slice(0, 20).map((s) => ({ chef_id: id, label: s.label.slice(0, 40), active: s.active })));
  return done();
}

export async function markFulfilled(bookingId: string, undo = false): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const { error } = await ctx.sb
    .from("bookings")
    .update({ fulfilled_at: undo ? null : new Date().toISOString() })
    .eq("id", bookingId);
  return error ? fail(error.message) : done();
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function replyToReview(reviewId: string, reply: string): Promise<Result> {
  if (!reply.trim()) return fail("Escreva a resposta.");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const { error } = await ctx.sb.rpc("reply_to_review", { p_review_id: reviewId, p_reply: reply });
  return error ? fail("Só pode responder uma vez.") : done();
}

export async function reportReview(reviewId: string, reason: string): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const session = await getSession();
  const { error } = await ctx.sb
    .from("reports")
    .insert({ reporter: session.userId, target_type: "review", target_id: reviewId, reason: reason.slice(0, 1000) });
  return error ? fail(error.message) : done();
}
