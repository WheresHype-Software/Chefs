import Link from "next/link";
import { AzulejoTile, type AzulejoVariant } from "@/components/brand/Azulejo";
import { SearchBar } from "@/components/search/SearchBar";
import { Photo } from "@/components/ui/Photo";
import { PHOTOS, type StockPhoto } from "@/lib/photos";

type Tile = { photo: StockPhoto } | { pattern: AzulejoVariant };

// The mosaic beside the promise, read left to right, top to bottom (3 × 3).
// `mobile` marks the three photos kept in the strip on phones.
const TILES: (Tile & { mobile?: boolean })[] = [
  { photo: PHOTOS.plated, mobile: true },
  { pattern: "glaze" },
  { photo: PHOTOS.cake },
  { pattern: "yolk" },
  { photo: PHOTOS.cooking, mobile: true },
  { pattern: "glaze" },
  { photo: PHOTOS.grill },
  { pattern: "cobalt" },
  { photo: PHOTOS.soup, mobile: true },
];

/** What makes asking safe, said where people decide to search. */
const PROMISES = ["Sem criar conta", "Só paga depois de o chef aceitar", "Paga diretamente ao chef"];

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="shrink-0 text-cobalt"
      aria-hidden="true"
    >
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  );
}

function MosaicTile({ tile, index, className = "" }: { tile: Tile; index: number; className?: string }) {
  const isPhoto = "photo" in tile;
  return (
    <div
      className={`tile-set aspect-square overflow-hidden rounded-[10px] ${className}`}
      style={{ animationDelay: `${200 + index * 70}ms` }}
      aria-hidden={isPhoto ? undefined : true}
    >
      {isPhoto ? (
        <Photo
          photo={tile.photo}
          sizes="(min-width: 1024px) 15vw, 33vw"
          priority={index < 3}
          className="h-full w-full transition-transform duration-700 ease-[var(--ease-out)] hover:scale-[1.06]"
        />
      ) : (
        <AzulejoTile variant={tile.pattern} />
      )}
    </div>
  );
}

/**
 * The opening: the promise and the search on the left, a mosaic of azulejo and food tiles on the
 * right that sets itself tile by tile. On phones the mosaic becomes a strip of three photos.
 */
export function HeroWall() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-12 pt-10 md:px-8 md:pb-16 md:pt-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-14 lg:pb-24 lg:pt-20">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1
              id="hero-title"
              className="al-in d m-0 max-w-[16ch] text-[clamp(38px,5vw,66px)] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink"
            >
              Chefs e cozinheiros caseiros perto de si.
            </h1>
            <p className="al-in m-0 max-w-[52ch] text-[17px] leading-relaxed text-ink-3 [animation-delay:120ms] md:text-[18px]">
              Jantares cozinhados em sua casa, marmitas para a semana, bolos e petiscos para levantar. Escolha, peça a reserva e pague
              diretamente ao chef.
            </p>
          </div>
          <div className="al-in [animation-delay:220ms]">
            <SearchBar size="hero" />
          </div>
          <div className="al-in flex flex-col gap-3 [animation-delay:320ms]">
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-[15px] font-medium text-ink-3">
              {PROMISES.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <Check />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/procurar" className="self-start text-[15px] font-semibold text-cobalt no-underline hover:underline">
              Ou veja todos os chefs no mapa →
            </Link>
          </div>
        </div>

        {/* Phones: three photos in a row. */}
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          {TILES.filter((t) => t.mobile).map((tile, i) => (
            <MosaicTile key={i} tile={tile} index={i} />
          ))}
        </div>

        {/* From lg: the full mosaic, gently floating. */}
        <div className="relative hidden lg:block" aria-hidden="true">
          <div className="al-float grid grid-cols-3 gap-2.5 [animation-duration:9s]">
            {TILES.map((tile, i) => (
              <MosaicTile key={i} tile={tile} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
