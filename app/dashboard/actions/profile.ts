"use server";

import { z } from "zod";
import { myAcceptance } from "@/lib/acceptance";
import { announceChefForReview } from "@/lib/notify/discord";
import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/dashboard";
import { notifyAdmin } from "@/lib/email";
import { requestTranslator } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/routing";
import { TIER_LABEL } from "@/lib/format";
import { instagramHandle } from "@/lib/instagram";
import { LANGUAGES } from "@/lib/languages";
import { requiredDepositPercent } from "@/lib/money";
import { getSettings, moneyRules } from "@/lib/settings";
import { fail, failInvalid, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { chefContext, done } from "./context";

const ProfileInput = z.object({
  display_name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  tier: z.enum(["professional", "home"]),
  cook_form: z.enum(["cozinheiro", "cozinheira"]),
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

export async function saveProfile(input: z.infer<typeof ProfileInput>): Promise<Result> {
  const locale = (await getLocale()) as Locale;
  const t = await requestTranslator("errors");
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) {
    const fields = [
      "display_name",
      "slug",
      "headline",
      "bio",
      "area_name",
      "service_radius_km",
      "instagram",
      "website",
      "years_experience",
      "deposit_percent",
    ] as const;
    const labels = Object.fromEntries(fields.map((f) => [f, t(`dashboard.profile.fields.${f}`)]));
    return failInvalid(parsed.error, t, labels);
  }
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const p = parsed.data;

  // The signal has to leave room for the commission, or the chef would be paid nothing.
  // The database enforces this too; catching it here is what makes it a sentence and not a crash.
  const settings = await getSettings();
  if (settings.paymentsEnabled && (p.deposit_percent ?? 0) > 0) {
    const min = requiredDepositPercent(moneyRules(settings));
    if (p.deposit_percent! < min) {
      const commission = locale === "pt" ? String(settings.commissionPercent).replace(".", ",") : String(settings.commissionPercent);
      return fail(t("dashboard.profile.depositMin", { min, commission }));
    }
  }
  // Stored as the bare username, whatever form it was typed in, so every link built from it works.
  const instagram = p.instagram ? instagramHandle(p.instagram) : null;
  if (p.instagram && !instagram) {
    return fail(t("dashboard.profile.instagram"));
  }
  const session = await getSession();
  if (!ctx.chef && session.role === "client") return fail(t("dashboard.profile.clientAccount"));
  const row = {
    display_name: p.display_name,
    slug: p.slug,
    tier: p.tier,
    cook_form: p.cook_form,
    headline: p.headline || null,
    bio: p.bio || null,
    area_name: p.area_name,
    service_radius_km: p.service_radius_km,
    socials: { instagram: instagram ?? undefined, website: p.website || undefined },
    years_experience: p.years_experience ?? null,
    deposit_percent: p.deposit_percent ?? null,
    ...(p.languages ? { languages: p.languages } : {}),
    ...(p.lat != null && p.lng != null ? { base_location: `SRID=4326;POINT(${p.lng} ${p.lat})` } : {}),
  };
  const write = (values: Partial<typeof row>) =>
    ctx.chef
      ? ctx.sb.from("chefs").update(values).eq("id", ctx.chef.id)
      : ctx.sb.from("chefs").insert({ ...values, profile_id: session.userId });
  let { error } = await write(row);
  // Until migration 20261102000001 adds chefs.cook_form, save everything else.
  if (error?.code === "PGRST204" && error.message.includes("cook_form")) {
    ({ error } = await write({ ...row, cook_form: undefined }));
  }
  if (error) {
    if (error.code === "23505") return fail(t("dashboard.profile.slugTaken"));
    return failWith(error, "saveProfile", t("dashboard.profile.saveFailed"));
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
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const { count } = await ctx.sb
    .from("chef_photos")
    .select("id", { count: "exact", head: true })
    .eq("chef_id", ctx.chef.id)
    .eq("kind", "gallery");
  // A public profile photo, and a private selfie the team compares it with.
  const { data: faces } = await ctx.sb.from("chef_photos").select("kind").eq("chef_id", ctx.chef.id).in("kind", ["portrait", "selfie"]);
  if (!faces?.some((f) => f.kind === "portrait")) return fail(t("dashboard.profile.noPortrait"));
  if (!faces.some((f) => f.kind === "selfie")) return fail(t("dashboard.profile.noSelfie"));
  if ((count ?? 0) < 3) return fail(t("dashboard.profile.needDishes"));
  if (!ctx.chef.socials.instagram && !ctx.chef.socials.website) return fail(t("dashboard.profile.needLink"));
  // Nothing goes public before the chef has accepted the terms and the contract that hold them
  // responsible for their own service.
  const { userId } = await getSession();
  const legal = userId ? await myAcceptance(userId) : { terms: false, contract: false };
  if (!legal.terms || !legal.contract) return fail(t("dashboard.profile.acceptFirst"));
  const { error } = await ctx.sb.from("chefs").update({ status: "pending" }).eq("id", ctx.chef.id);
  if (error) return failWith(error, "submitForReview", t("dashboard.profile.submitFailed"));

  const chef = ctx.chef;
  // O email chega à caixa de quem o lê quando o abre; o Discord chega ao telemóvel de quem estiver
  // por perto. Nenhum dos dois pode impedir o envio para revisão de ficar registado.
  void announceChefForReview(chef).catch((err) => console.error("[profile] aviso no Discord:", err));
  const handle = instagramHandle(chef.socials.instagram);
  const portfolio = handle ? `Instagram @${handle}` : chef.socials.instagram || chef.socials.website || "—";
  await notifyAdmin({
    subject: `Perfil para verificar: ${chef.display_name}`,
    preheader: `${chef.display_name}, ${chef.area_name ?? "zona por indicar"}, espera aprovação.`,
    heading: "Um perfil espera verificação",
    lead: `${chef.display_name} enviou o perfil para revisão. Compare a selfie com a fotografia de perfil, veja os pratos e o trabalho anterior, e aprove ou peça alterações.`,
    facts: [
      ["Nome público", chef.display_name],
      ["Como se descreve", TIER_LABEL[chef.tier] ?? chef.tier],
      ["Zona", `${chef.area_name ?? "—"} · ${chef.service_radius_km} km à volta`],
      ["Fotos de pratos", String(count ?? 0)],
      ["Trabalho anterior", portfolio],
    ],
    cta: { label: "Abrir a fila de aprovação", href: "/admin#aprovar" },
    footnote: "A selfie de verificação é privada: abre-se por um link temporário, dentro da administração.",
  });
  return done();
}
