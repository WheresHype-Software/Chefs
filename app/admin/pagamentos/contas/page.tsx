import type { Metadata } from "next";
import { ChefAccounts } from "@/components/admin/ChefAccounts";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contas de chefs", robots: { index: false } };

export default async function ContasPage() {
  if (!hasSupabase) return null;
  const view = await getAdminPayments();
  return <ChefAccounts accounts={view.accounts} />;
}
