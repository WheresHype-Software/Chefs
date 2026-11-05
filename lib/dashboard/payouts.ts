import "server-only";
import { chefScope } from "./session";

/** What the chef is owed, what is on its way, and what has already been paid. */
export type PayoutSummary = {
  balance: number;
  held: number;
  waiting: number;
  due: number;
  batched: number;
  paidThisYear: number;
  toAcknowledge: number;
};

export type PayoutRow = {
  id: string;
  amount: number;
  status: "due" | "held" | "batched" | "paid" | "cancelled";
  due_at: string;
  paid_at: string | null;
  reason: string | null;
  hold_reason: string | null;
  booking: { ref: string; date: string; offer_title: string } | null;
};

export type PayoutDocumentRow = {
  id: string;
  number: string;
  issued_at: string;
  status: "issued" | "void";
  acknowledged_at: string | null;
  amount: number;
  bookingRef: string | null;
};

export type PayoutsView = { summary: PayoutSummary; payouts: PayoutRow[]; documents: PayoutDocumentRow[] };

const EMPTY: PayoutSummary = { balance: 0, held: 0, waiting: 0, due: 0, batched: 0, paidThisYear: 0, toAcknowledge: 0 };

const DEMO: PayoutsView = {
  summary: { balance: 118.8, held: 0, waiting: 59.4, due: 59.4, batched: 0, paidThisYear: 237.6, toAcknowledge: 1 },
  payouts: [
    {
      id: "p1",
      amount: 59.4,
      status: "due",
      due_at: new Date(Date.now() + 20 * 3600_000).toISOString(),
      paid_at: null,
      reason: null,
      hold_reason: null,
      booking: { ref: "AL-1104-0493", date: "2026-11-04", offer_title: "Petiscos para 8" },
    },
    {
      id: "p2",
      amount: 59.4,
      status: "paid",
      due_at: new Date(Date.now() - 8 * 86400_000).toISOString(),
      paid_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
      reason: null,
      hold_reason: null,
      booking: { ref: "AL-1020-0471", date: "2026-10-20", offer_title: "Jantar do Minho" },
    },
  ],
  documents: [
    {
      id: "d1",
      number: "AL-PAG-2026-0007",
      issued_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
      status: "issued",
      acknowledged_at: null,
      amount: 59.4,
      bookingRef: "AL-1020-0471",
    },
  ],
};

export async function getPayouts(): Promise<PayoutsView> {
  const scope = await chefScope();
  if (scope.demo) return DEMO;
  const { sb, chef } = scope;

  const [summary, payouts, documents] = await Promise.all([
    sb.rpc("chef_payout_summary", { p_chef: chef.id }),
    sb
      .from("payouts")
      .select("id, amount, status, due_at, paid_at, reason, hold_reason, bookings(ref, date, offer_title)")
      .eq("chef_id", chef.id)
      .order("due_at", { ascending: false })
      .limit(100),
    sb
      .from("payout_documents")
      .select("id, number, issued_at, status, acknowledged_at, snapshot")
      .eq("chef_id", chef.id)
      .order("issued_at", { ascending: false })
      .limit(100),
  ]);

  const raw = (summary.data as Record<string, string | number> | null) ?? null;
  return {
    summary: raw
      ? {
          balance: Number(raw.balance),
          held: Number(raw.held),
          waiting: Number(raw.waiting),
          due: Number(raw.due),
          batched: Number(raw.batched),
          paidThisYear: Number(raw.paidThisYear),
          toAcknowledge: Number(raw.toAcknowledge),
        }
      : EMPTY,
    payouts: (
      (payouts.data ?? []) as unknown as (Omit<PayoutRow, "booking" | "amount"> & {
        amount: string;
        bookings: PayoutRow["booking"];
      })[]
    ).map((p) => ({ ...p, amount: Number(p.amount), booking: p.bookings })),
    documents: (
      (documents.data ?? []) as unknown as {
        id: string;
        number: string;
        issued_at: string;
        status: "issued" | "void";
        acknowledged_at: string | null;
        snapshot: { amounts?: { payout?: number }; booking?: { ref?: string } };
      }[]
    ).map((d) => ({
      id: d.id,
      number: d.number,
      issued_at: d.issued_at,
      status: d.status,
      acknowledged_at: d.acknowledged_at,
      amount: Number(d.snapshot?.amounts?.payout ?? 0),
      bookingRef: d.snapshot?.booking?.ref ?? null,
    })),
  };
}
