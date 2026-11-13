import { SiteHeader } from "@/components/SiteChrome";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[1080px] px-5 py-10 md:px-8">
        <PageSkeleton label="A carregar a reserva" boxes={2} />
      </main>
    </div>
  );
}
