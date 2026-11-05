import "server-only";
import { getSettings, type PlatformSettings } from "../settings";
import { createClient } from "../supabase/server";

/**
 * Everything the payments console shows, read as the signed-in admin so row level security is
 * doing the authorising rather than a flag in the code.
 */

export type AdminPaymentRow = {
  id: string;
  booking_id: string;
  method: "mbway" | "multibanco" | "card";
  status: string;
  amount: number;
  refunded_amount: number;
  created_at: string;
  paid_at: string | null;
  provider_reference: string | null;
  provider_transaction_id: string | null;
  phone_masked: string | null;
  booking: { ref: string; date: string; offer_title: string } | null;
};

export type AdminRefundRow = {
  id: string;
  booking_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
  client_iban_last4: string | null;
  client_iban_holder: string | null;
  booking: { ref: string } | null;
};

export type AdminBatchRow = {
  id: string;
  reference: string;
  status: "draft" | "exported" | "paid" | "cancelled";
  total: number;
  chef_count: number;
  created_at: string;
  paid_at: string | null;
  bank_reference: string | null;
};

export type AdminPayoutRow = {
  id: string;
  chef_id: string;
  amount: number;
  status: string;
  due_at: string;
  hold_reason: string | null;
  reason: string | null;
  chef: { display_name: string; slug: string; payouts_blocked: boolean } | null;
  booking: { ref: string } | null;
};

export type AdminChefAccount = {
  chef_id: string;
  display_name: string;
  legal_name: string | null;
  nif: string | null;
  iban_last4: string | null;
  iban_approved_at: string | null;
  iban_changed_at: string | null;
  payout_hold_until: string | null;
  payouts_blocked: boolean;
  payouts_blocked_reason: string | null;
};

export type AdminDocumentRow = {
  id: string;
  number: string;
  issued_at: string;
  status: "issued" | "void";
  acknowledged_at: string | null;
  chef_id: string;
  amount: number;
  chefName: string | null;
  bookingRef: string | null;
};

export type AdminPaymentsView = {
  settings: PlatformSettings;
  totals: { depositsThisMonth: number; commissionThisMonth: number; refundedThisMonth: number; owed: number };
  payments: AdminPaymentRow[];
  refunds: AdminRefundRow[];
  batches: AdminBatchRow[];
  duePayouts: AdminPayoutRow[];
  accounts: AdminChefAccount[];
  documents: AdminDocumentRow[];
};

const num = (v: unknown): number => Number(v ?? 0);

export async function getAdminPayments(): Promise<AdminPaymentsView> {
  const sb = await createClient();
  const settings = await getSettings();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [payments, refunds, batches, payouts, billing, documents, ledger] = await Promise.all([
    sb
      .from("payments")
      .select(
        "id, booking_id, method, status, amount, refunded_amount, created_at, paid_at, provider_reference, provider_transaction_id, phone_masked, bookings(ref, date, offer_title)",
      )
      .order("created_at", { ascending: false })
      .limit(60),
    sb
      .from("refunds")
      .select("id, booking_id, amount, reason, status, created_at, client_iban_last4, client_iban_holder, bookings(ref)")
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(40),
    sb
      .from("payout_batches")
      .select("id, reference, status, total, chef_count, created_at, paid_at, bank_reference")
      .order("created_at", { ascending: false })
      .limit(12),
    sb
      .from("payouts")
      .select("id, chef_id, amount, status, due_at, hold_reason, reason, chefs(display_name, slug, payouts_blocked), bookings(ref)")
      .in("status", ["due", "held"])
      .order("due_at", { ascending: true })
      .limit(80),
    sb
      .from("chef_billing")
      .select(
        "chef_id, legal_name, nif, iban_last4, iban_approved_at, iban_changed_at, payout_hold_until, chefs(display_name, payouts_blocked, payouts_blocked_reason)",
      )
      .order("updated_at", { ascending: false })
      .limit(60),
    sb
      .from("payout_documents")
      .select("id, number, issued_at, status, acknowledged_at, chef_id, snapshot, chefs(display_name)")
      .order("issued_at", { ascending: false })
      .limit(40),
    sb.from("ledger_entries").select("kind, amount, created_at").gte("created_at", monthStart).limit(2000),
  ]);

  const entries = (ledger.data ?? []) as { kind: string; amount: string }[];
  const sumOf = (kind: string) => entries.filter((e) => e.kind === kind).reduce((a, e) => a + num(e.amount), 0);
  // What we are holding for chefs right now: everything due or held, batched or not.
  const owed = ((payouts.data ?? []) as { amount: string }[]).reduce((a, p) => a + num(p.amount), 0);

  return {
    settings,
    totals: {
      depositsThisMonth: sumOf("deposit_in"),
      // Commission rows are negative from the chef's side; show what we actually kept.
      commissionThisMonth: -sumOf("commission"),
      refundedThisMonth: -sumOf("refund"),
      owed,
    },
    payments: (
      (payments.data ?? []) as unknown as (Omit<AdminPaymentRow, "amount" | "refunded_amount" | "booking"> & {
        amount: string;
        refunded_amount: string;
        bookings: AdminPaymentRow["booking"];
      })[]
    ).map((p) => ({ ...p, amount: num(p.amount), refunded_amount: num(p.refunded_amount), booking: p.bookings })),
    refunds: (
      (refunds.data ?? []) as unknown as (Omit<AdminRefundRow, "amount" | "booking"> & {
        amount: string;
        bookings: AdminRefundRow["booking"];
      })[]
    ).map((r) => ({ ...r, amount: num(r.amount), booking: r.bookings })),
    batches: ((batches.data ?? []) as unknown as (Omit<AdminBatchRow, "total"> & { total: string })[]).map((b) => ({
      ...b,
      total: num(b.total),
    })),
    duePayouts: (
      (payouts.data ?? []) as unknown as (Omit<AdminPayoutRow, "amount" | "chef" | "booking"> & {
        amount: string;
        chefs: AdminPayoutRow["chef"];
        bookings: AdminPayoutRow["booking"];
      })[]
    ).map((p) => ({ ...p, amount: num(p.amount), chef: p.chefs, booking: p.bookings })),
    accounts: (
      (billing.data ?? []) as unknown as (Omit<AdminChefAccount, "display_name" | "payouts_blocked" | "payouts_blocked_reason"> & {
        chefs: { display_name: string; payouts_blocked: boolean; payouts_blocked_reason: string | null } | null;
      })[]
    ).map((b) => ({
      chef_id: b.chef_id,
      display_name: b.chefs?.display_name ?? "—",
      legal_name: b.legal_name,
      nif: b.nif,
      iban_last4: b.iban_last4,
      iban_approved_at: b.iban_approved_at,
      iban_changed_at: b.iban_changed_at,
      payout_hold_until: b.payout_hold_until,
      payouts_blocked: b.chefs?.payouts_blocked ?? false,
      payouts_blocked_reason: b.chefs?.payouts_blocked_reason ?? null,
    })),
    documents: (
      (documents.data ?? []) as unknown as {
        id: string;
        number: string;
        issued_at: string;
        status: "issued" | "void";
        acknowledged_at: string | null;
        chef_id: string;
        snapshot: { amounts?: { payout?: number }; booking?: { ref?: string } };
        chefs: { display_name: string } | null;
      }[]
    ).map((d) => ({
      id: d.id,
      number: d.number,
      issued_at: d.issued_at,
      status: d.status,
      acknowledged_at: d.acknowledged_at,
      chef_id: d.chef_id,
      amount: num(d.snapshot?.amounts?.payout),
      chefName: d.chefs?.display_name ?? null,
      bookingRef: d.snapshot?.booking?.ref ?? null,
    })),
  };
}
