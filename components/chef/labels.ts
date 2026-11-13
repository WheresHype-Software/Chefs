// Codes stored on a chef (how they take payment, which cancellation preset) and the message key
// that names each one: chef.terms.payment.<code>, chef.terms.policy.<code>. Unknown codes are null,
// and are shown as they are.

const PAYMENT_METHODS = ["mbway", "transfer", "cash"] as const;
const POLICIES = ["flexible", "moderate", "strict", "custom"] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number];
export type PolicyCode = (typeof POLICIES)[number];

export const paymentKey = (code: string): PaymentMethodCode | null =>
  (PAYMENT_METHODS as readonly string[]).includes(code) ? (code as PaymentMethodCode) : null;

export const policyKey = (code: string): PolicyCode | null =>
  (POLICIES as readonly string[]).includes(code) ? (code as PolicyCode) : null;
