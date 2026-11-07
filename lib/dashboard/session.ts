import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { announceChefSignup, announceUserSignup } from "../notify/discord";
import { createClient, hasSupabase } from "../supabase/server";
import { DEMO_CHEF } from "./demo";
import type { MyChef, Role, Session } from "./types";

export const getSession = cache(async (): Promise<Session> => {
  if (!hasSupabase) return { demo: true, userId: null, role: "chef" };
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await sb.from("profiles").select("role, name, signup_announced_at").eq("id", user.id).single();
  const role = (profile?.role ?? "client") as Role;
  if (profile && !profile.signup_announced_at) void announceSignup(user.id, role, profile.name as string | null);
  return { demo: false, userId: user.id, role };
});

/**
 * O aviso de que alguém se inscreveu, enviado no primeiro pedido que essa pessoa faz já com
 * sessão. É o mais perto do momento da inscrição a que se chega sem meter o Postgres a falar com
 * o Discord: a conta é criada por um trigger em auth.users e o browser vem logo a seguir para uma
 * página nossa.
 *
 * Quem conseguir carimbar a data é quem envia. Em duas renderizações ao mesmo tempo, só uma
 * escreve, e por isso só uma avisa.
 */
async function announceSignup(userId: string, role: Role, name: string | null) {
  try {
    const sb = await createClient();
    const { data } = await sb
      .from("profiles")
      .update({ signup_announced_at: new Date().toISOString() })
      .eq("id", userId)
      .is("signup_announced_at", null)
      .select("id");
    if (!data?.length) return; // outra renderização chegou primeiro
    await (role === "chef" ? announceChefSignup(name) : announceUserSignup(name));
  } catch (err) {
    console.error("[session] aviso de inscrição:", err);
  }
}

export const getMyChef = cache(async (): Promise<MyChef | null> => {
  const s = await getSession();
  if (s.demo) return DEMO_CHEF;
  const sb = await createClient();
  const { data } = await sb
    .from("chefs")
    .select(
      "id, slug, display_name, tier, headline, bio, area_name, service_radius_km, status, badges, verification_notes, socials, rating_avg, review_count, deposit_percent, years_experience, languages, lat, lng",
    )
    .eq("profile_id", s.userId)
    .maybeSingle();
  return (data as unknown as MyChef) ?? null;
});

export async function requireChef(): Promise<MyChef> {
  const chef = await getMyChef();
  if (!chef) redirect("/dashboard/perfil");
  return chef;
}

/**
 * The signed-in chef with a Supabase client to query their rows, or `demo` when Supabase isn't
 * configured (callers then return demo data). Redirects to the profile form without a chef.
 */
export async function chefScope() {
  const chef = await requireChef();
  if ((await getSession()).demo) return { demo: true as const, chef };
  return { demo: false as const, chef, sb: await createClient() };
}
