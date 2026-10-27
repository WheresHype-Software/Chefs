import { AzulejoTile, type AzulejoVariant } from "@/components/brand/Azulejo";
import { SearchBar } from "@/components/search/SearchBar";
import { Photo } from "@/components/ui/Photo";
import { PHOTOS, type StockPhoto } from "@/lib/photos";

type Tile = { photo: StockPhoto } | { pattern: AzulejoVariant };

// Right-hand side of the wall, read left to right, top to bottom (3 × 3 on desktop).
// `mobile` marks the photos kept on phones, `tablet` the six kept on tablets.
const TILES: (Tile & { mobile?: boolean; tablet?: boolean })[] = [
  { photo: PHOTOS.plated, mobile: true, tablet: true },
  { pattern: "glaze", tablet: true },
  { photo: PHOTOS.cake, tablet: true },
  { pattern: "yolk", tablet: true },
  { photo: PHOTOS.cooking, mobile: true, tablet: true },
  { pattern: "glaze", tablet: true },
  { photo: PHOTOS.grill },
  { pattern: "cobalt" },
  { photo: PHOTOS.soup, mobile: true },
];

function WallTile({ tile, index, className }: { tile: Tile; index: number; className: string }) {
  const isPhoto = "photo" in tile;
  return (
    <div
      className={`tile-set aspect-square overflow-hidden rounded-[3px] ${className}`}
      style={{ animationDelay: `${120 + index * 45}ms` }}
      aria-hidden={isPhoto ? undefined : true}
    >
      {isPhoto ? (
        <Photo photo={tile.photo} sizes="(min-width: 1024px) 12vw, 33vw" priority={index < 3} className="h-full w-full" />
      ) : (
        <AzulejoTile variant={tile.pattern} />
      )}
    </div>
  );
}

/**
 * The opening: a kitchen wall of tiles. A large white glazed panel set into the wall carries the
 * promise and the search; around it, pattern tiles alternate with food photographs.
 */
export function HeroWall() {
  return (
    <section aria-labelledby="hero-title" className="bg-line">
      <div className="mx-auto grid max-w-[1440px] grid-cols-3 gap-1 p-1 md:grid-cols-6 md:gap-1.5 md:p-1.5 lg:grid-cols-8">
        <div className="tile-set col-span-3 flex flex-col justify-center gap-6 rounded-[3px] bg-white px-5 py-10 md:col-span-6 md:px-12 md:py-14 lg:col-span-5 lg:row-span-3 lg:px-14 lg:py-10 xl:px-16">
          <div className="flex flex-col gap-4">
            <h1
              id="hero-title"
              className="d m-0 max-w-[16ch] text-[clamp(38px,4.6vw,64px)] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink"
            >
              Chefs e cozinheiros caseiros perto de si.
            </h1>
            <p className="m-0 max-w-[52ch] text-[17px] leading-relaxed text-ink-3 md:text-[18px]">
              Jantares cozinhados em sua casa, marmitas para a semana, bolos e petiscos para levantar. Escolha, peça a reserva e pague
              diretamente ao chef, sem comissões.
            </p>
          </div>
          <SearchBar size="hero" />
        </div>
        {TILES.map((tile, i) => (
          <WallTile
            key={i}
            tile={tile}
            index={i}
            className={`${tile.mobile ? "" : "hidden"} ${tile.tablet ? "md:block" : "md:hidden"} lg:block`}
          />
        ))}
      </div>
    </section>
  );
}
