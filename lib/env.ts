// Public configuration, safe for the browser. NEXT_PUBLIC_* values are inlined at build time,
// so each one must be read with its literal name.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's new publishable key (sb_publishable_…); the legacy anon key still works as a fallback.
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const publicEnv = {
  supabaseUrl,
  supabaseKey,
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron",
} as const;

/** True when the app is wired to a Supabase project; otherwise it runs on demo data. */
export const hasSupabase = Boolean(supabaseUrl && supabaseKey);

/** Typed accessor for the Supabase config; only call it after checking hasSupabase. */
export function supabaseConfig(): { url: string; key: string } {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  return { url: supabaseUrl, key: supabaseKey };
}

export function siteUrl(path = ""): string {
  return publicEnv.siteUrl + path;
}
