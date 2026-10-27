/** Grey placeholder block for loading screens; size and shape come from className. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-line/80 motion-reduce:animate-none ${className}`} />;
}

/** Standard "page is loading" frame: a title line, an intro line and a few content boxes. */
export function PageSkeleton({ label, boxes = 3 }: { label: string; boxes?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      <Skeleton className="h-10 w-2/3 max-w-[380px]" />
      <Skeleton className="h-4 w-1/2 max-w-[300px]" />
      {Array.from({ length: boxes }, (_, i) => (
        <div key={i} className="box flex flex-col gap-3 p-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
