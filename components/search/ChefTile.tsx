import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { Star } from "@/components/ui/Star";
import { chefTitle, fromPrice, isVerifiedChef, SERVICE_LABEL, titledName } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

function distanceLabel(km: number): string {
  return km < 0.5 ? "muito perto" : `a ${String(km).replace(".", ",")} km`;
}

/** Verified chefs carry a filled "Chef verificado" mark; cooks a plain "Cozinheiro" one. */
function TitleBadge({ badges }: { badges: string[] }) {
  const verified = isVerifiedChef(badges);
  return (
    <span
      className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold ${
        verified ? "bg-cobalt text-white" : "bg-white/95 text-ink"
      }`}
    >
      {verified && <VerifiedIcon />}
      {verified ? "Chef verificado" : chefTitle(badges)}
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

/** A chef in the results grid: the food photo leads, then who, where and how much. */
export function ChefTile({ chef, priority = false }: { chef: ChefCard; priority?: boolean }) {
  return (
    <Link href={`/chef/${chef.slug}`} className="group flex flex-col gap-3 text-ink no-underline hover:text-ink">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-paper">
        <Photo
          photo={chef.cover}
          alt={`Prato de ${chef.name}`}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          priority={priority}
          className="h-full w-full transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03]"
        />
        <TitleBadge badges={chef.badges} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="m-0 text-[19px] font-bold leading-tight tracking-[-0.01em] group-hover:text-cobalt">{titledName(chef)}</h3>
          <span className="shrink-0 text-[14px]">
            <RatingLine chef={chef} />
          </span>
        </div>
        <span className="text-[15px] text-ink-3">{chef.headline ?? chef.categories.join(" · ")}</span>
        <span className="text-[14px] text-muted">
          {chef.area}
          {chef.distanceKm != null && ` · ${distanceLabel(chef.distanceKm)}`}
          {" · "}
          {chef.services.map((s) => SERVICE_LABEL[s]).join(", ")}
        </span>
        <span className="mt-1 text-[15px]">
          desde <strong className="num font-bold">{fromPrice(chef.offers)}</strong>
        </span>
      </div>
    </Link>
  );
}
