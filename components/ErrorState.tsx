"use client";

import { Link } from "@/lib/i18n/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

type Props = {
  error: unknown;
  retry: () => void;
  /** Where "back" goes; the home page by default. */
  backHref?: string;
  backLabel?: string;
};

/**
 * What people see when a page fails: a plain sentence and a way forward, never the technical
 * error. The error itself goes to the browser console (server errors are logged on the server,
 * with the digest shown here so support can match them).
 */
export function ErrorState({ error, retry, backHref = "/", backLabel }: Props) {
  const t = useTranslations("support.errorPage");
  const tc = useTranslations("common.actions");
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <div role="alert" className="flex max-w-[640px] flex-col items-start gap-4 py-10">
      <h1 className="d m-0 text-[clamp(30px,5vw,48px)] leading-[1.05]">{t("title")}</h1>
      <p className="m-0 text-muted">{t("text")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => retry()}>
          {tc("retry")}
        </button>
        <Link href={backHref} className="btn btn-o">
          {backLabel ?? t("backHome")}
        </Link>
      </div>
      {digest && <span className="text-xs text-faint">{t("reference", { digest })}</span>}
    </div>
  );
}
