import { useTranslations } from "next-intl";
import { revealDelay } from "@/lib/motion";

const POINTS = ["reviewed", "reviews", "written"] as const;

/** Why a stranger's kitchen is a safe bet: verification, real reviews, a written record. */
export function TrustPoints() {
  const t = useTranslations("home.trust");
  return (
    <section aria-labelledby="confianca-title" className="border-y border-line bg-paper">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_2fr]">
        <h2 id="confianca-title" className="al-rv d m-0 max-w-[14ch] text-[clamp(28px,3.4vw,40px)] leading-[1.05]">
          {t("title")}
        </h2>
        <ul className="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
          {POINTS.map((key, i) => (
            <li key={key} className="al-rv flex flex-col gap-2" style={revealDelay(i)}>
              <span aria-hidden="true" className="h-1 w-10 rounded-full bg-cobalt" />
              <h3 className="m-0 mt-2 text-[18px] font-bold leading-snug">{t(`points.${key}.title`)}</h3>
              <p className="m-0 text-[16px] leading-relaxed text-ink-3">{t(`points.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
