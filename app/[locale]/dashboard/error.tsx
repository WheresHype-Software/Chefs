"use client";

import { ErrorState } from "@/components/ErrorState";

/** Keeps the dashboard navigation around a failed section. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} backHref="/dashboard" backLabel="Voltar ao painel" />;
}
