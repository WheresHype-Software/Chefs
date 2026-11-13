import { useTranslations } from "next-intl";
import { SiteHeader } from "@/components/SiteChrome";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  const t = useTranslations("booking.status");
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[1080px] px-5 py-10 md:px-8">
        <PageSkeleton label={t("loading")} boxes={2} />
      </main>
    </div>
  );
}
