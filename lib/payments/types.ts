/**
 * The contract between the app and whoever moves the money.
 *
 * Only `lib/payments/eupago.ts` knows that EuPago exists. Everything else — the booking flow, the
 * admin console, the reconciliation job — talks to this interface, so moving to split payments or
 * to another provider is one file, not a rewrite.
 */

export type ProviderResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/** What the provider gives back when a payment is opened. */
export type CreatedPayment = {
  /** The provider's own reference for this payment (an MB reference, or an MB WAY request id). */
  providerReference: string | null;
  /** The provider's transaction id (EuPago calls it trid); needed for refunds. */
  providerTransactionId: string | null;
  /** Multibanco only. */
  entity: string | null;
  /** When the client can no longer pay it. */
  expiresAt: string | null;
};

/** The states we care about. Anything we do not recognise is "unknown", never "paid". */
export type ProviderPaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded" | "unknown";

export type ProviderStatus = {
  status: ProviderPaymentStatus;
  /** What the provider says was actually paid, in cents. Checked against what we asked for. */
  amountCents: number | null;
  providerTransactionId: string | null;
  raw: unknown;
};

export type CreateMbwayInput = {
  /** Our own identifier for the payment, echoed back on the webhook. */
  identifier: string;
  amountCents: number;
  /** Nine digits, no country code. */
  phone: string;
  email?: string | null;
  name?: string | null;
};

export type CreateMultibancoInput = {
  identifier: string;
  amountCents: number;
  /** The reference stops working after this day. */
  expiresOn: string;
  email?: string | null;
  phone?: string | null;
};

export type StatusQuery = {
  reference?: string | null;
  entity?: string | null;
  transactionId?: string | null;
};

export type RefundInput = {
  transactionId: string;
  amountCents: number;
  reason: string;
  /** Needed when the provider cannot push the money back by itself (a Multibanco reference). */
  iban?: string | null;
  bic?: string | null;
};

export interface PaymentProvider {
  readonly name: string;
  createMbway(input: CreateMbwayInput): Promise<ProviderResult<CreatedPayment>>;
  createMultibanco(input: CreateMultibancoInput): Promise<ProviderResult<CreatedPayment>>;
  status(query: StatusQuery): Promise<ProviderResult<ProviderStatus>>;
  refund(input: RefundInput): Promise<ProviderResult<{ refundId: string | null }>>;
}
