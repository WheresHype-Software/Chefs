"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/** The guest's private booking link, with copy and (on phones) share. */
export function PrivateLink({ url, title }: { url: string; title: string }) {
  const t = useTranslations("booking.privateLink");
  const [copied, setCopied] = useState(false);
  // Read after hydration so server and first client render agree.
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the field is selectable, so people can still copy by hand.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">{t("label")}</span>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="w-full truncate rounded-[3px] border border-line-2 bg-paper px-3 py-2.5 text-sm text-ink-3"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={copy}>
          {copied ? t("copied") : t("copy")}
        </button>
        {canShare && (
          <button type="button" className="btn btn-sm btn-o" onClick={() => navigator.share({ title, url }).catch(() => {})}>
            {t("share")}
          </button>
        )}
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}
