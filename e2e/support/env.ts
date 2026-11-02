import { loadEnvConfig } from "@next/env";

// Same env files as `next dev`, so the tests and the app talk to the same Supabase project.
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
