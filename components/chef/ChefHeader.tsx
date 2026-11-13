import { useLocale, useTranslations } from "next-intl";
import { ICONS } from "@/components/chef/icons";
import { Photo } from "@/components/ui/Photo";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { BADGES, type Badge } from "@/lib/constants";
import { chefTitle, decimal, initials, isVerifiedChef, titledName } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import { instagramHandle, instagramUrl } from "@/lib/instagram";
import type { ChefProfile } from "@/lib/types";

/** The chef's face, large (the only place it appears on the page), title and badges, name, and where/rating/Instagram. */
export function ChefHeader({ chef }: { chef: ChefProfile }) {
  const t = useTranslations("chef");
  const locale = useLocale() as Locale;
  const verified = isVerifiedChef(chef.badges);
  const handle = instagramHandle(chef.socials.instagram);
  const otherBadges = chef.badges.filter((b): b is Badge => b !== "certified" && (BADGES as readonly string[]).includes(b));
  return (
    <div className="flex flex-wrap items-center gap-5 md:gap-8">
      <div className="aspect-[4/5] w-36 shrink-0 overflow-hidden rounded-[16px] bg-cobalt-soft shadow-[0_14px_36px_-16px_rgb(20_32_51/0.5)] ring-4 ring-white sm:w-44 md:w-52">
        {chef.portrait ? (
          <Photo
            photo={chef.portrait}
            alt={t("header.photoOf", { name: chef.name })}
            sizes="(min-width: 768px) 208px, 176px"
            priority
            className="h-full w-full"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-[44px] font-extrabold tracking-[-0.03em] text-cobalt md:text-[56px]"
          >
            {initials(chef.name)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          <li
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${verified ? "bg-cobalt text-white" : "bg-white text-ink ring-1 ring-line-2"}`}
          >
            {verified && <VerifiedIcon size={13} />}
            {verified ? t("header.verifiedChef") : chefTitle(chef.badges, locale)}
          </li>
          {otherBadges.map((b) => (
            <li key={b} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[13px] text-ink-3 ring-1 ring-line-2">
              <span className="text-cobalt [&_svg]:h-3.5 [&_svg]:w-3.5">{ICONS.check}</span>
              {t(`badges.${b}`)}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1">
          <h1 className="d m-0 text-[clamp(32px,5vw,52px)] leading-[1.02]">{titledName(chef, locale)}</h1>
          {chef.headline && <p className="m-0 text-[18px] font-medium text-ink-3">{chef.headline}</p>}
        </div>

        <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1.5 p-0 text-[15px] text-ink-3 [&_svg]:h-[18px] [&_svg]:w-[18px]">
          <li className="flex items-center gap-1.5">
            <span className="text-muted">{ICONS.pin}</span>
            {chef.area}
          </li>
          <li>
            <a href="#avaliacoes" className="flex items-center gap-1.5 text-ink-3 no-underline hover:text-cobalt">
              <span className="text-cobalt">{ICONS.star}</span>
              {chef.reviewCount && chef.rating
                ? t("header.rating", { rating: decimal(Number(chef.rating), 1, locale), count: chef.reviewCount })
                : t("header.new")}
            </a>
          </li>
          {handle && (
            <li>
              <a
                href={instagramUrl(handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-ink-3 no-underline hover:text-cobalt"
              >
                <span className="text-muted">{ICONS.instagram}</span>@{handle}
              </a>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
