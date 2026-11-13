import { SiteHeader } from "@/components/SiteChrome";

/** Shown instantly while a new search runs on the server. */
export default function Loading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="A procurar chefs">
      <SiteHeader />
      <div className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pb-6 pt-8 md:px-8 md:pt-10">
          <div className="h-[62px] rounded-[12px] border border-line-2 bg-white" />
          <div className="h-10 w-2/3 max-w-[420px] animate-pulse rounded-md bg-line" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 w-28 rounded-full bg-line/70" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-x-6 gap-y-10 px-5 py-10 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-[4/3] animate-pulse rounded-[10px] bg-line/80" />
            <div className="h-5 w-1/2 rounded bg-line" />
            <div className="h-4 w-3/4 rounded bg-line/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
