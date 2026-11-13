"use client";

import { useTranslations } from "next-intl";
import { setConsent } from "@/lib/consent";

/** Reopens the cookie banner so the visitor can change their answer. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("home.cookies");
  return (
    <button
      type="button"
      onClick={() => {
        setConsent(null);
        // A pixel already loaded keeps running until the page reloads; reload so "Recusar" takes effect at once.
        if ((window as unknown as { fbq?: unknown }).fbq) window.location.reload();
      }}
      className={className}
    >
      {t("settings")}
    </button>
  );
}
