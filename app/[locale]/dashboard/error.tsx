"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ErrorState";

/** Keeps the dashboard navigation around a failed section. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("dashboard.layout");
  return <ErrorState error={error} retry={retry} backHref="/dashboard" backLabel={t("backToDashboard")} />;
}
