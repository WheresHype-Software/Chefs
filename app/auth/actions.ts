"use server";

import { redirect } from "next/navigation";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  if (hasSupabase) await (await createClient()).auth.signOut();
  redirect("/");
}
