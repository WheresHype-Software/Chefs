"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { acceptAgreement } from "@/app/dashboard/actions/billing";
import { FormMessage } from "@/components/ui/FormMessage";
import { reflow } from "@/lib/acceptance-format";
import { euro } from "@/lib/format";
import { type Locale } from "@/lib/i18n/routing";
import { useServerAction } from "@/hooks/useServerAction";

type Props = {
  text: string;
  version: number;
  acceptedVersion: number | null;
  highlights: readonly string[];
  /** Shown above the text when it is a translation (the Portuguese contract is the binding one). */
  notice?: string;
  commissionPercent: number;
  commissionMin: number;
};

/**
 * The contract. Accepting it is what lets us collect the signal in the chef's name and issue the
 * payment documents without a signature on each one, so the full text is on the page — not behind
 * a link — and the checkbox is never pre-ticked.
 */
export function AgreementCard({ text, version, acceptedVersion, highlights, notice, commissionPercent, commissionMin }: Props) {
  const t = useTranslations("dashboard.billing.agreement");
  const locale = useLocale() as Locale;
  const [checked, setChecked] = useState(false);
  const { run, pending, message } = useServerAction(acceptAgreement, {
    successMessage: t("accepted"),
  });
  const accepted = acceptedVersion != null && acceptedVersion >= version;
  const outdated = acceptedVersion != null && acceptedVersion < version;
  const pct = String(commissionPercent).replace(".", locale === "pt" ? "," : ".");
  const min = euro(commissionMin, locale);

  return (
    <section className="box flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="d m-0 text-2xl font-normal">{t("title")}</h2>
        <span className="lab text-muted">{accepted ? t("versionAccepted", { version }) : t("version", { version })}</span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        {highlights.map((h) => (
          <li key={h} className="flex gap-2.5">
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span>{h}</span>
          </li>
        ))}
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span>
            {t.rich("commission", { percent: pct, min, strong: (c) => <strong className="num">{c}</strong> })}
          </span>
        </li>
      </ul>

      {outdated && <p className="m-0 border-l-2 border-line-2 pl-3 text-sm">{t("outdated", { version: acceptedVersion })}</p>}

      <details className="border-t border-line pt-4">
        <summary className="lab cursor-pointer text-muted">{t("readFull")}</summary>
        {notice && <p className="m-0 mt-3 border-l-2 border-line-2 pl-3 text-sm text-ink-3">{notice}</p>}
        <pre className="m-0 mt-3 max-h-[380px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-3">
          {reflow(text)}
        </pre>
      </details>

      {!accepted && (
        <form
          className="flex flex-col gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
            {/* Word for word what lib/acceptance.ts stores as the consent for the contract. */}
            <span>{t("consent")}</span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn" disabled={pending || !checked}>
              {pending ? t("registering") : t("accept")}
            </button>
            <FormMessage message={message} />
          </div>
        </form>
      )}
      {accepted && <FormMessage message={message} />}
    </section>
  );
}
