import type { Metadata } from "next";
import { PayoutDocumentList } from "@/components/admin/PayoutDocumentList";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documentos", robots: { index: false } };

export default async function DocumentosPage() {
  if (!hasSupabase) return null;
  const view = await getAdminPayments();
  return <PayoutDocumentList documents={view.documents} />;
}
