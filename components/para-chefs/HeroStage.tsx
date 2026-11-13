import Image from "next/image";
import { useTranslations } from "next-intl";
import painel from "@/public/para-chefs/painel.png";

/** The hero image: the chef's own panel, as it really looks on a phone. */
export function HeroStage() {
  const t = useTranslations("paraChefs.hero");
  return (
    <div className="al-in relative flex min-w-0 flex-[1_1_440px] flex-col items-center gap-4" style={{ animationDelay: "220ms" }}>
      <div className="relative flex w-full justify-center">
        <div className="fabric absolute inset-x-0 bottom-10 top-10 rounded-[3px] border border-line" aria-hidden="true" />
        <div className="relative w-[280px] max-w-full rounded-[38px] border-[8px] border-ink bg-ink shadow-[0_30px_70px_rgba(17,17,16,.22)] sm:w-[310px]">
          <Image
            src={painel}
            alt={t("imageAlt")}
            sizes="620px"
            placeholder="blur"
            priority
            className="h-auto w-full rounded-[30px] bg-paper"
          />
        </div>
      </div>
      <span className="text-[13px] text-muted">{t("imageCaption")}</span>
    </div>
  );
}
