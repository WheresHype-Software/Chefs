import type { Metadata } from "next";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Movimentos", robots: { index: false } };

export default async function MovimentosPage() {
  if (!hasSupabase) return null;
  const view = await getAdminPayments();
  return <PaymentsTable payments={view.payments} />;
}
