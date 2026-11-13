"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { setConsent, useConsent } from "@/lib/consent";

/**
 * Asks once whether the Meta Pixel may run. Nothing is loaded before the visitor says yes, and
 * refusing is the same single tap as accepting, in the same place.
 */
export function CookieBanner() {
  const t = useTranslations("home.cookies");
  const consent = useConsent();
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("label")}
      aria-labelledby="cookies-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-[720px] flex-col gap-4 rounded-box border border-line-2 bg-white p-4 shadow-[0_12px_40px_rgba(20,32,51,0.18)] sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="cookies-title" className="m-0 text-[16px] font-bold leading-snug">
          {t("title")}
        </h2>
        <p className="m-0 text-[14px] leading-relaxed text-ink-3">
          {t("text")}{" "}
          <Link href="/privacidade#cookies" className="underline">
            {t("learnMore")}
          </Link>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn btn-sm btn-o flex-1 sm:w-[112px] sm:flex-none" onClick={() => setConsent("denied")}>
          {t("reject")}
        </button>
        <button type="button" className="btn btn-sm btn-o flex-1 sm:w-[112px] sm:flex-none" onClick={() => setConsent("granted")}>
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
