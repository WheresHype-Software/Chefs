"use server";

import { headers } from "next/headers";
import { redirectLocalized } from "@/lib/i18n/server";
import { z } from "zod";
import { recordAcceptance } from "@/lib/acceptance";
import { siteUrl } from "@/lib/email";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  if (hasSupabase) await (await createClient()).auth.signOut();
  return redirectLocalized("/");
}

const SignUpInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(200),
  asChef: z.boolean(),
  // Same-site paths only, as on the sign-in page.
  next: z.string().regex(/^\/(?![/\\])/),
  accepted: z.literal(true),
});

export type SignUpResult = { ok: true; session: boolean } | { ok: false; error: string };

/**
 * Creates the account and records, in the same request, that the person accepted the terms (and,
 * for a chef, the contract). It runs on the server so the record has the visitor's IP and browser
 * as they arrived, not whatever a browser chose to say about itself.
 *
 * `error` is Supabase's own message: the form turns it into a Portuguese sentence it can act on.
 */
export async function signUpWithTerms(input: Omit<z.infer<typeof SignUpInput>, "accepted"> & { accepted: boolean }): Promise<SignUpResult> {
  const parsed = SignUpInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: input.accepted ? "invalid sign-up form" : "terms not accepted" };
  }
  const { name, email, password, asChef, next } = parsed.data;

  const origin = (await headers()).get("origin") ?? siteUrl();
  const sb = await createClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      // Only used if email confirmation is switched on in Supabase.
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { name, role: asChef ? "chef" : "client" },
    },
  });
  if (error) return { ok: false, error: error.message };

  // With email confirmation on, an address that already has an account comes back as a user with
  // no identities, so as not to reveal that it exists. There is nothing to record for it.
  const user = data.user;
  if (user && (user.identities?.length ?? 0) > 0) {
    const recorded = await recordAcceptance({ userId: user.id, email, name }, asChef ? ["terms", "chef_contract"] : ["terms"], "signup");
    // The account exists either way. A chef whose acceptance did not land is asked again before
    // the profile goes to review; nobody is locked out by a failed insert.
    if (!recorded) console.error(`[auth] acceptance not recorded for ${user.id}`);
  }
  return { ok: true, session: Boolean(data.session) };
}
