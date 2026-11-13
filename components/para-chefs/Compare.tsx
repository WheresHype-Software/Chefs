import { useTranslations } from "next-intl";
import { revealDelay } from "@/lib/motion";

const ROWS = ["requests", "conversations", "calendar", "trust"] as const;

function Mark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? "bg-yolk text-ink" : "bg-line text-muted"}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        {on ? <path d="M5 12.5 10 17 19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
    </span>
  );
}

/** The two columns side by side: how it is today, and how it is here. */
export function Compare() {
  const t = useTranslations("paraChefs.compare");
  return (
    <section className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 pb-20 pt-[72px] md:px-10 md:pb-[120px]">
      <h2 className="d al-rv m-0 max-w-[720px] text-[clamp(38px,6vw,68px)] leading-none">{t("title")}</h2>

      <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5">
        <article className="al-rv flex flex-col rounded-[14px] border border-line bg-paper p-6 md:p-9">
          <h3 className="d m-0 text-[26px] text-ink-3">{t("today.title")}</h3>
          <p className="m-0 mt-1 text-[15px] text-muted">{t("today.lead")}</p>
          <ul className="m-0 mt-6 flex list-none flex-col gap-0 p-0">
            {ROWS.map((key) => (
              <li key={key} className="flex gap-3.5 border-t border-line py-4">
                <Mark on={false} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <strong className="text-[15px] font-semibold text-ink-3">{t(`rows.${key}.topic`)}</strong>
                  <span className="text-[15px] leading-[1.4] text-muted">{t(`rows.${key}.today`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="al-rv flex flex-col rounded-[14px] bg-cobalt-deep p-6 text-white md:p-9" style={revealDelay(1, 2)}>
          <h3 className="d m-0 text-[26px]">{t("withUs.title")}</h3>
          <p className="m-0 mt-1 text-[15px] text-[#c9d6ee]">{t("withUs.lead")}</p>
          <ul className="m-0 mt-6 flex list-none flex-col gap-0 p-0">
            {ROWS.map((key) => (
              <li key={key} className="flex gap-3.5 border-t border-[#2a4a86] py-4">
                <Mark on />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <strong className="text-[15px] font-semibold text-[#c9d6ee]">{t(`rows.${key}.topic`)}</strong>
                  <span className="d text-[18px] leading-[1.3]">{t(`rows.${key}.withUs`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
