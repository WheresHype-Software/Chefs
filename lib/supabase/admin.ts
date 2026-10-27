import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Secret-key client for server-only jobs that must bypass RLS (e.g. looking up a chef's email
 * to notify them). Returns null when no secret key is configured.
 */
export function createAdminClient() {
  if (!publicEnv.supabaseUrl || !serverEnv.supabaseSecretKey) return null;
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
