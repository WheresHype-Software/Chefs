import { Link } from "@/lib/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { Star } from "@/components/ui/Star";
import { chefTitle, fromPrice, initials, isVerifiedChef, SERVICE_LABEL, titledName } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

function distanceLabel(km: number): string {
  return km < 0.5 ? "muito perto" : `a ${String(km).replace(".", ",")} km`;
}

/** Verified chefs carry a filled "Chef verificado" mark; cooks a plain "Cozinheiro" one. */
function TitleBadge({ badges }: { badges: string[] }) {
  const verified = isVerifiedChef(badges);
  return (
    <span
      className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold shadow-[0_2px_8px_rgb(20_32_51/0.15)] ${
        verified ? "bg-cobalt text-white" : "bg-white/95 text-ink"
      }`}
    >
      {verified && <VerifiedIcon />}
      {verified ? "Chef verificado" : chefTitle(badges)}
    </span>
  );
}

/** The person: their photo (or initials), large, set into the corner of the dishes. */
function Face({ chef }: { chef: ChefCard }) {
  return (
    <span className="absolute -bottom-10 left-4 aspect-[4/5] w-[88px] overflow-hidden rounded-[14px] bg-cobalt-soft shadow-[0_10px_24px_-10px_rgb(20_32_51/0.55)] ring-4 ring-white">
      {chef.portrait ? (
        <Photo photo={chef.portrait} alt="" sizes="88px" className="h-full w-full" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[28px] font-extrabold tracking-[-0.03em] text-cobalt"
          aria-hidden="true"
        >
          {initials(chef.name)}
        </span>
      )}
    </span>
  );
}

/** Their food: one large dish and up to two more beside it. */
function Dishes({ chef, priority }: { chef: ChefCard; priority: boolean }) {
  const dishes = (chef.dishes.length ? chef.dishes : [chef.cover]).slice(0, 3);
  const zoom = "h-full w-full transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]";
  if (dishes.length === 1) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-paper">
        <Photo
          photo={dishes[0]}
          alt={`Prato de ${chef.name}`}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          priority={priority}
          className={zoom}
        />
      </div>
    );
  }
  return (
    <div className="grid aspect-[4/3] grid-cols-[2fr_1fr] grid-rows-2 gap-1 overflow-hidden rounded-[12px] bg-paper">
      {dishes.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className={`min-h-0 overflow-hidden ${i === 0 ? "row-span-2" : ""} ${dishes.length === 2 && i === 1 ? "row-span-2" : ""}`}
        >
          <Photo
            photo={url}
            alt={i === 0 ? `Prato de ${chef.name}` : ""}
            sizes={i === 0 ? "(min-width: 1024px) 20vw, 66vw" : "(min-width: 1024px) 10vw, 33vw"}
            priority={priority && i === 0}
            className={zoom}
          />
        </div>
      ))}
    </div>
  );
}

function RatingLine({ chef }: { chef: ChefCard }) {
  if (!chef.rating || chef.reviewCount === 0) return <span className="font-semibold text-cobalt">Novo no Ao Lume</span>;
  return (
    <span className="flex items-center gap-1 font-semibold">
      <Star />
      <span>{Number(chef.rating).toFixed(1).replace(".", ",")}</span>
      <span className="font-normal text-muted">({chef.reviewCount})</span>
    </span>
  );
}

/** A chef in a grid: their dishes and, large, their face; then who, where, what they do and from how much. */
export function ChefTile({ chef, priority = false }: { chef: ChefCard; priority?: boolean }) {
  const price = fromPrice(chef.offers);
  return (
    <Link href={`/chef/${chef.slug}`} className="group flex flex-col text-ink no-underline hover:text-ink">
      <div className="relative">
        <Dishes chef={chef} priority={priority} />
        <TitleBadge badges={chef.badges} />
        <Face chef={chef} />
      </div>
      <div className="flex flex-col gap-1 pt-12">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="m-0 min-w-0 text-[19px] font-bold leading-tight tracking-[-0.01em] [overflow-wrap:anywhere] group-hover:text-cobalt">
            {titledName(chef)}
          </h3>
          <span className="shrink-0 text-[14px]">
            <RatingLine chef={chef} />
          </span>
        </div>
        {chef.headline && <span className="text-[15px] text-ink-3">{chef.headline}</span>}
        {chef.categories.length > 0 && <span className="text-[14px] font-medium text-cobalt">{chef.categories.join(" · ")}</span>}
        <span className="text-[14px] text-muted">
          {chef.area}
          {chef.distanceKm != null && ` · ${distanceLabel(chef.distanceKm)}`}
        </span>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
          <ul className="m-0 flex min-w-0 list-none flex-wrap gap-1 p-0">
            {chef.services.slice(0, 3).map((s) => (
              <li key={s} className="rounded-full bg-paper px-2 py-0.5 text-[12px] text-ink-3">
                {SERVICE_LABEL[s]}
              </li>
            ))}
          </ul>
          <span className="shrink-0 text-[15px]">
            {price === "orçamento" ? (
              "Sob orçamento"
            ) : (
              <>
                desde <strong className="font-bold tabular-nums">{price}</strong>
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
