import { Photo } from "@/components/ui/Photo";
import type { ChefProfile } from "@/lib/types";

// Gallery layout by photo count: hero 2×2 plus the rest.
const GRID: Record<number, string> = {
  0: "grid-cols-2",
  1: "grid-cols-2",
  2: "grid-cols-2 md:grid-cols-3 md:grid-rows-2",
  3: "grid-cols-2 md:grid-cols-3 md:grid-rows-2",
  4: "grid-cols-2 md:grid-cols-3 md:grid-rows-2",
  5: "grid-cols-2 md:grid-cols-4 md:grid-rows-2",
};

/** Photos at the top of the chef page: a swipeable strip on phones, a mosaic from tablets up. */
export function ChefGallery({ gallery }: { gallery: ChefProfile["gallery"] }) {
  const photos = gallery.length ? gallery : [{ url: null, caption: "Fotografia" }];
  return (
    <section className="mx-auto max-w-[1240px] px-5 pt-4 md:px-8 md:pt-6">
      {/* Phones: swipe through every photo. */}
      <ul
        aria-label="Fotografias"
        className="-mx-5 m-0 flex list-none snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] md:hidden"
      >
        {photos.map((p, i) => (
          <li
            key={i}
            className={`aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-[10px] ${photos.length > 1 ? "w-[86%]" : "w-full"}`}
          >
            <Photo
              photo={p.url}
              alt={p.caption}
              priority={i === 0}
              sizes="86vw"
              fallback={i % 2 ? "cobalt" : "glaze"}
              className="h-full w-full"
            />
          </li>
        ))}
      </ul>
      <div className={`hidden h-[440px] gap-2.5 md:grid ${GRID[Math.min(photos.length, 5)]}`}>
        {photos.slice(0, photos.length >= 5 ? 5 : 3).map((p, i) => (
          <div key={i} className={`overflow-hidden rounded-[10px] ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
            <Photo
              photo={p.url}
              alt={p.caption}
              priority={i === 0}
              sizes={i === 0 ? "60vw" : "30vw"}
              fallback={i % 2 ? "cobalt" : "glaze"}
              className="h-full w-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
