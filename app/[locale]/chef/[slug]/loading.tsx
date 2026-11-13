import { SiteHeader } from "@/components/SiteChrome";
import { Skeleton } from "@/components/ui/Skeleton";

/** Shown at once when opening a chef, so the previous page never lingers. */
export default function Loading() {
  return (
    <div role="status" aria-label="A carregar o perfil do chef">
      <SiteHeader />
      <div className="mx-auto max-w-[1240px] px-5 pt-4 md:px-8 md:pt-6">
        <Skeleton className="aspect-[4/3] w-full rounded-[10px] md:aspect-auto md:h-[440px]" />
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-12 px-5 pb-20 pt-7 md:gap-14 md:px-8 md:pt-10">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <div className="flex items-center gap-5">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full md:h-24 md:w-24" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="box flex min-w-0 flex-[1_1_360px] flex-col gap-4 p-6">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
