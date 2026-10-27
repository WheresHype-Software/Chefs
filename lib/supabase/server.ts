import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";

export { hasSupabase } from "@/lib/env";

/** Request-scoped client that acts as the signed-in user (RLS applies). */
export async function createClient() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Anonymous client for public reads and guest RPCs (no cookies, RLS applies). */
export function createAnonClient() {
  const { url, key } = supabaseConfig();
  return createPlainClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
