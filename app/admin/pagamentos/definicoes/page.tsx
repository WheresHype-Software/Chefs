import type { Metadata } from "next";
import { Dac7Export } from "@/components/admin/Dac7Export";
import { PaymentSettingsForm } from "@/components/admin/PaymentSettingsForm";
import { getAdminPayments } from "@/lib/admin/payments";
import { hasEupago } from "@/lib/env.server";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Definições de pagamentos", robots: { index: false } };

export default async function DefinicoesPage() {
  if (!hasSupabase) return null;
  const view = await getAdminPayments();
  const thisYear = new Date().getFullYear();
  return (
    <>
      <PaymentSettingsForm settings={view.settings} providerReady={hasEupago} />
      <Dac7Export years={[thisYear, thisYear - 1, thisYear - 2]} />
    </>
  );
}
