"use server";

import { getSession } from "@/lib/dashboard";
import { failWith, ok, type ActionResult as Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { done } from "./context";

/**
 * Turns Lumi's help on or off for the account, on every page and device. Kept in the user's
 * auth metadata: a preference only they read and write, with no table of its own.
 */
export async function setLumi(on: boolean): Promise<Result> {
  const session = await getSession();
  if (session.demo) return ok();
  const sb = await createClient();
  const { error } = await sb.auth.updateUser({ data: { lumi_off: !on } });
  return error ? failWith(error, "setLumi", "Não foi possível guardar a preferência.") : done();
}
