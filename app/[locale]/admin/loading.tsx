import { Wordmark } from "@/components/SiteChrome";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center px-5 md:px-8">
          <Wordmark />
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-5 py-10 md:px-8">
        <PageSkeleton label="A carregar a administração" />
      </main>
    </div>
  );
}
