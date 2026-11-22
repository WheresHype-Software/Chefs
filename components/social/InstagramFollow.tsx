import { useTranslations } from "next-intl";
import { ICONS } from "@/components/chef/icons";
import { Photo } from "@/components/ui/Photo";
import { PHOTOS } from "@/lib/photos";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/social";

/** Four dishes laid out like a profile grid: a hint of what the account shows, not a live feed. */
const GRID = [PHOTOS.plated, PHOTOS.cake, PHOTOS.bowl, PHOTOS.grill];

/**
 * An invitation to follow Ao Lume on Instagram. For clients it is where the dishes are; for
 * chefs it is one more place their food gets seen. A plain link: embedding the feed would bring
 * Meta's scripts and cookies onto every visit.
 */
export function InstagramFollow({ audience }: { audience: "clients" | "chefs" }) {
  const t = useTranslations(`common.instagram.${audience}`);
  const tc = useTranslations("common.instagram");
  return (
    <section aria-labelledby={`instagram-${audience}`} className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-10 px-5 py-16 md:gap-16 md:px-8 md:py-24">
        <div className="al-rv flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="lab flex items-center gap-2 self-start text-cobalt no-underline hover:text-cobalt-deep"
          >
            {ICONS.instagram}@{INSTAGRAM_HANDLE}
          </a>
          <h2 id={`instagram-${audience}`} className="d m-0 text-[clamp(30px,4.4vw,52px)] leading-[1.02]">
            {t("title")}
          </h2>
          <p className="m-0 max-w-[520px] text-[17px] leading-relaxed text-ink-3">
            {t.rich("text", { handle: () => <strong className="text-ink">@{INSTAGRAM_HANDLE}</strong> })}
          </p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn gap-2 self-start">
            {ICONS.instagram}
            {tc("follow")}
          </a>
        </div>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={tc("open", { handle: INSTAGRAM_HANDLE })}
          className="al-rv grid min-w-0 flex-[1_1_320px] grid-cols-2 gap-2 sm:gap-3"
        >
          {GRID.map((photo, i) => (
            <Photo
              key={photo.id}
              photo={photo}
              alt=""
              sizes="(min-width: 768px) 280px, 45vw"
              className={`aspect-square w-full rounded-[10px] object-cover ${i % 2 ? "translate-y-4 sm:translate-y-6" : ""}`}
            />
          ))}
        </a>
      </div>
    </section>
  );
}
