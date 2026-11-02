import { AzulejoTile, type AzulejoVariant } from "@/components/brand/Azulejo";
import { Photo } from "@/components/ui/Photo";
import { PHOTOS, type StockPhoto } from "@/lib/photos";

type Tile = { photo: StockPhoto } | { pattern: AzulejoVariant };

// Clients see the table; chefs see the kitchen.
const CLIENT: Tile[] = [
  { photo: PHOTOS.table },
  { pattern: "glaze" },
  { photo: PHOTOS.cake },
  { pattern: "cobalt" },
  { photo: PHOTOS.plated },
  { photo: PHOTOS.salad },
];
const CHEF: Tile[] = [
  { photo: PHOTOS.cooking },
  { pattern: "glaze" },
  { photo: PHOTOS.grill },
  { pattern: "yolk" },
  { photo: PHOTOS.plated },
  { photo: PHOTOS.spread },
];

/** The sign-in page's picture: food and azulejo tiles that set themselves one by one. */
export function SignInMosaic({ forChefs }: { forChefs: boolean }) {
  const tiles = forChefs ? CHEF : CLIENT;
  return (
    <div aria-hidden="true" className="grid grid-cols-3 gap-2 lg:grid-cols-2 lg:gap-2.5">
      {tiles.map((tile, i) => (
        <div
          key={i}
          // On phones only the first row shows, as a strip above the form.
          className={`tile-set aspect-square overflow-hidden rounded-[12px] ${i >= 3 ? "hidden lg:block" : ""}`}
          style={{ animationDelay: `${150 + i * 90}ms` }}
        >
          {"photo" in tile ? (
            <Photo photo={tile.photo} sizes="(min-width: 1024px) 18vw, 33vw" priority={i < 2} className="h-full w-full" />
          ) : (
            <AzulejoTile variant={tile.pattern} />
          )}
        </div>
      ))}
    </div>
  );
}
