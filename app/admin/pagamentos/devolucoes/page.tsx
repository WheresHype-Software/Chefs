import type { Metadata } from "next";
import { RefundQueue } from "@/components/admin/RefundQueue";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Devoluções", robots: { index: false } };

export default async function DevolucoesPage() {
  if (!hasSupabase) return null;
  const view = await getAdminPayments();
  return <RefundQueue refunds={view.refunds} />;
}
