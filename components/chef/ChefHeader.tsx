import { Photo } from "@/components/ui/Photo";
import { BADGE_LABEL, type Badge } from "@/lib/constants";
import { initials, isVerifiedChef, rating, titledName } from "@/lib/format";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import type { ChefProfile } from "@/lib/types";

/** Profile photo (or initials), title (Chef verificado or Cozinheiro) and badges, name, and the one-line summary. */
export function ChefHeader({ chef }: { chef: ChefProfile }) {
  const verified = isVerifiedChef(chef.badges);
  return (
    <div className="flex flex-wrap items-center gap-5 md:gap-6">
      {chef.portrait ? (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-cobalt-soft md:h-24 md:w-24">
          <Photo photo={chef.portrait} alt={`Fotografia de ${chef.name}`} sizes="96px" priority className="h-full w-full" />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-[22px] font-extrabold tracking-[-0.03em] text-cobalt md:h-24 md:w-24 md:text-[30px]"
        >
          {initials(chef.name)}
        </div>
      )}
      <div className="flex flex-[1_1_300px] flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {verified ? (
            <span className="lab flex items-center gap-1.5 rounded-[2px] bg-cobalt px-[9px] py-[5px] text-white">
              <VerifiedIcon size={13} />
              Chef verificado
            </span>
          ) : (
            <span className="lab rounded-[2px] border border-line-2 px-[9px] py-[5px]">Cozinheiro</span>
          )}
          {chef.badges
            .filter((b) => b !== "certified")
            .map((b) => (
              <span key={b} className="lab rounded-[2px] border border-line-2 px-[9px] py-[5px] text-muted">
                {BADGE_LABEL[b as Badge] ?? b}
              </span>
            ))}
        </div>
        <h1 className="d m-0 text-[clamp(36px,6vw,60px)] leading-none">{titledName(chef)}</h1>
        <span className="text-muted">
          {chef.headline} · {chef.area} · {rating(chef.rating, chef.reviewCount)}
          {chef.socials.instagram && (
            <>
              {" · "}
              <a href={`https://instagram.com/${chef.socials.instagram.replace("@", "")}`} rel="noopener">
                {chef.socials.instagram}
              </a>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
