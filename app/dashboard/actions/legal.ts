"use server";

import { z } from "zod";
import { recordAcceptance } from "@/lib/acceptance";
import { getSession } from "@/lib/dashboard";
import { requestTranslator } from "@/lib/i18n/server";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { done } from "./context";

const Input = z.object({
  kinds: z
    .array(z.enum(["terms", "chef_contract"]))
    .min(1)
    .max(2),
  context: z.enum(["onboarding", "dashboard", "billing"]),
});

/** A signed-in chef accepts the current terms and/or contract, from the dashboard. */
export async function acceptLegal(
  kinds: ("terms" | "chef_contract")[],
  context: "onboarding" | "dashboard" | "billing",
): Promise<ActionResult> {
  const t = await requestTranslator("errors");
  const parsed = Input.safeParse({ kinds, context });
  if (!parsed.success) return fail(t("invalidRequest"));
  const session = await getSession();
  if (session.demo) return ok();
  if (!session.userId) return fail(t("dashboard.legal.signInFirst"));

  const sb = await createClient();
  const [{ data: auth }, { data: profile }] = await Promise.all([
    sb.auth.getUser(),
    sb.from("profiles").select("name").eq("id", session.userId).maybeSingle(),
  ]);
  const recorded = await recordAcceptance(
    { userId: session.userId, email: auth.user?.email ?? null, name: (profile?.name as string | null) ?? null },
    [...new Set(parsed.data.kinds)],
    parsed.data.context,
  );
  if (!recorded) return fail(t("dashboard.legal.acceptFailed"));
  return done(parsed.data.context === "billing" ? "/dashboard/faturacao" : "/dashboard");
}
