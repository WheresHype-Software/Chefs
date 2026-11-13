import { useTranslations } from "next-intl";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  const t = useTranslations("account");
  return <PageSkeleton label={t("loading")} boxes={2} />;
}
