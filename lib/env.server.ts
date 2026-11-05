import "server-only";
import { COMPANY, EMAIL } from "./legal";

// Secrets: never import this module from client code. || not ??: compose passes unset values as "".
export const serverEnv = {
  // New secret key (sb_secret_…) or the legacy service_role key.
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || `Ao Lume <${EMAIL.bookings}>`,
  // Where verification requests land.
  adminEmail: process.env.ADMIN_EMAIL || EMAIL.verification,

  // --- Payments -------------------------------------------------------------
  // The hard kill switch. Payments also have to be enabled in platform_settings; both must be on.
  paymentsEnabled: (process.env.PAYMENTS_ENABLED || "").toLowerCase() === "true",
  eupago: {
    env: (process.env.EUPAGO_ENV || "sandbox") as "sandbox" | "production",
    apiKey: process.env.EUPAGO_API_KEY,
    // Realtime Webhooks 2.0: HMAC-SHA256 secret, and the AES key when the body is encrypted.
    webhookSecret: process.env.EUPAGO_WEBHOOK_SECRET,
    webhookEncryptionKey: process.env.EUPAGO_WEBHOOK_ENCRYPTION_KEY,
    // OAuth client credentials; the management API (refunds) does not take the API key.
    clientId: process.env.EUPAGO_CLIENT_ID,
    clientSecret: process.env.EUPAGO_CLIENT_SECRET,
  },
  /** The company account the chef payouts leave from, for the SEPA file. */
  platformAccount: {
    name: process.env.PLATFORM_ACCOUNT_NAME || COMPANY.name,
    iban: process.env.PLATFORM_IBAN,
    bic: process.env.PLATFORM_BIC,
  },
  /** Shared secret for the reconciliation endpoint, called from cron. */
  reconcileSecret: process.env.RECONCILE_SECRET,
  /** Encrypts IBANs at rest. Read lazily: the app must boot without it when payments are off. */
  payoutEncryptionKey: process.env.PAYOUT_ENCRYPTION_KEY,
} as const;

/** True when the EuPago client has what it needs. Checked before any payment action. */
export const hasEupago = Boolean(serverEnv.eupago.apiKey && serverEnv.payoutEncryptionKey);
