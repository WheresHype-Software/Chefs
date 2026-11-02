import Link from "next/link";
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

/** The person: their photo (or initials) set into the corner of the dish photo. */
function Face({ chef }: { chef: ChefCard }) {
  return (
    <span className="absolute -bottom-7 left-4 h-16 w-16 overflow-hidden rounded-full bg-cobalt-soft shadow-[0_6px_18px_-6px_rgb(20_32_51/0.45)] ring-4 ring-white">
      {chef.portrait ? (
        <Photo photo={chef.portrait} alt="" sizes="64px" className="h-full w-full" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[20px] font-extrabold tracking-[-0.03em] text-cobalt"
          aria-hidden="true"
        >
          {initials(chef.name)}
        </span>
      )}
    </span>
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

/** A chef in a grid: their food and their face, then who, where, what they do and from how much. */
export function ChefTile({ chef, priority = false }: { chef: ChefCard; priority?: boolean }) {
  const price = fromPrice(chef.offers);
  return (
    <Link href={`/chef/${chef.slug}`} className="group flex flex-col text-ink no-underline hover:text-ink">
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-paper">
          <Photo
            photo={chef.cover}
            alt={`Prato de ${chef.name}`}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
            priority={priority}
            className="h-full w-full transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]"
          />
        </div>
        <TitleBadge badges={chef.badges} />
        <Face chef={chef} />
      </div>
      <div className="flex flex-col gap-1 pt-9">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="m-0 min-w-0 text-[19px] font-bold leading-tight tracking-[-0.01em] [overflow-wrap:anywhere] group-hover:text-cobalt">
            {titledName(chef)}
          </h3>
          <span className="shrink-0 text-[14px]">
            <RatingLine chef={chef} />
          </span>
        </div>
        <span className="text-[15px] text-ink-3">{chef.headline ?? chef.categories.join(" · ")}</span>
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
