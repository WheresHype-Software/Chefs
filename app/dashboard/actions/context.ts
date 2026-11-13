// Shared by the dashboard's server actions; not an action module itself.
import "server-only";
import { revalidateLocalized } from "@/lib/i18n/server";
import { getMyChef, getSession } from "@/lib/dashboard";
import { ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

export const NO_CHEF = "Crie primeiro o seu perfil de chef, em Perfil.";

/** The signed-in chef (null before they create a profile) and a Supabase client, or `demo`. */
export async function chefContext() {
  const session = await getSession();
  const chef = await getMyChef();
  if (session.demo) return { demo: true as const, chef, sb: null };
  return { demo: false as const, chef, sb: await createClient() };
}

/** Success: refresh the dashboard so server components show the change. */
export function done(path = "/dashboard"): ActionResult {
  revalidateLocalized(path, "layout");
  return ok();
}
