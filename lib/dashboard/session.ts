import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
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
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  return { demo: false, userId: user.id, role: (profile?.role ?? "client") as Role };
});

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
