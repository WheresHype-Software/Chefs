"use server";

import { z } from "zod";
import { getSession } from "@/lib/dashboard";
import { LANGUAGES } from "@/lib/languages";
import { fail, failInvalid, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { chefContext, done, NO_CHEF } from "./context";

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
  // Optional: shown on the public page only when set.
  languages: z
    .array(z.enum(LANGUAGES.map(([code]) => code) as [string, ...string[]]))
    .max(LANGUAGES.length)
    .optional(),
});

const PROFILE_LABELS: Record<string, string> = {
  display_name: "Nome público",
  slug: "O link só pode ter letras, números e hífenes.",
  headline: "Especialidade",
  bio: "Sobre si",
  area_name: "Zona de base",
  service_radius_km: "Raio de serviço",
  instagram: "Instagram",
  website: "Site",
  years_experience: "Anos de experiência",
  deposit_percent: "Sinal pedido",
};

export async function saveProfile(input: z.infer<typeof ProfileInput>): Promise<Result> {
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) return failInvalid(parsed.error, PROFILE_LABELS);
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const p = parsed.data;
  const session = await getSession();
  if (!ctx.chef && session.role === "client")
    return fail("Esta é uma conta de cliente. Para ter um perfil de chef, crie uma conta de chef.");
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
    ...(p.languages ? { languages: p.languages } : {}),
    ...(p.lat != null && p.lng != null ? { base_location: `SRID=4326;POINT(${p.lng} ${p.lat})` } : {}),
  };
  const { error } = ctx.chef
    ? await ctx.sb.from("chefs").update(row).eq("id", ctx.chef.id)
    : await ctx.sb.from("chefs").insert({ ...row, profile_id: session.userId });
  if (error) {
    if (error.code === "23505") return fail("Esse link já está a ser usado. Escolha outro.");
    return failWith(error, "saveProfile", "Não foi possível guardar o perfil. Tente de novo.");
  }
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

/** The new chef's id, read past getMyChef's per-request cache (which still holds null). */
async function getMyChefFresh(): Promise<string | null> {
  const sb = await createClient();
  const s = await getSession();
  const { data } = await sb.from("chefs").select("id").eq("profile_id", s.userId).maybeSingle();
  return data?.id ?? null;
}

export async function submitForReview(): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const { count } = await ctx.sb
    .from("chef_photos")
    .select("id", { count: "exact", head: true })
    .eq("chef_id", ctx.chef.id)
    .eq("kind", "gallery");
  // A public profile photo, and a private selfie the team compares it with.
  const { data: faces } = await ctx.sb.from("chef_photos").select("kind").eq("chef_id", ctx.chef.id).in("kind", ["portrait", "selfie"]);
  if (!faces?.some((f) => f.kind === "portrait")) return fail("Falta a fotografia de perfil.");
  if (!faces.some((f) => f.kind === "selfie")) return fail("Falta a selfie de verificação, em Fotografias.");
  if ((count ?? 0) < 3) return fail("Carregue pelo menos três fotos de pratos.");
  if (!ctx.chef.socials.instagram && !ctx.chef.socials.website) return fail("Indique o Instagram ou o site.");
  const { error } = await ctx.sb.from("chefs").update({ status: "pending" }).eq("id", ctx.chef.id);
  return error ? failWith(error, "submitForReview", "Não foi possível enviar para revisão. Tente de novo.") : done();
}
