import { useTranslations } from "next-intl";
import { PageSkeleton } from "@/components/ui/Skeleton";

/** Shown at once when moving between dashboard sections; the navigation stays in place. */
export default function Loading() {
  const t = useTranslations("dashboard.layout");
  return <PageSkeleton label={t("loading")} />;
}
