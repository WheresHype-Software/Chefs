import "server-only";
import { EMAIL } from "./legal";

// Secrets: never import this module from client code. || not ??: compose passes unset values as "".
export const serverEnv = {
  // New secret key (sb_secret_…) or the legacy service_role key.
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || `Ao Lume <${EMAIL.bookings}>`,
  // Where verification requests land.
  adminEmail: process.env.ADMIN_EMAIL || EMAIL.verification,
} as const;
