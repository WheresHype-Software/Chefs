import type { Metadata } from "next";
import { PayoutBatches } from "@/components/admin/PayoutBatches";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pagar aos chefs", robots: { index: false } };

export default async function LotesPage() {
  if (!hasSupabase) return null;
  const view = await getAdminPayments();
  return <PayoutBatches batches={view.batches} duePayouts={view.duePayouts} readyPayoutIds={view.readyPayoutIds} owed={view.totals.owed} />;
}
