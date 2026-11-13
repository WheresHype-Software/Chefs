"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { acceptLegal } from "@/app/dashboard/actions/legal";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";

type Kind = "terms" | "chef_contract";

type Props = {
  /** What is still to accept: the checkbox names only these. */
  kinds: Kind[];
  context: "onboarding" | "dashboard";
  title?: string;
  intro?: string;
};

/**
 * The same checkbox as at sign-up, for chefs who have not accepted the current terms or contract:
 * accounts made before it existed, clients who became chefs, and every new version of a text.
 */
export function LegalAcceptanceCard({ kinds, context, title, intro }: Props) {
  const t = useTranslations("dashboard.legal");
  const [checked, setChecked] = useState(false);
  const { run, pending, message } = useServerAction(acceptLegal, {
    successMessage: t("success"),
  });
  const terms = kinds.includes("terms");
  const contract = kinds.includes("chef_contract");
  const key = terms && contract ? "acceptBoth" : terms ? "acceptTerms" : "acceptContract";
  const links = {
    terms: (c: ReactNode) => (
      <a href="/termos" target="_blank" rel="noopener">
        {c}
      </a>
    ),
    contract: (c: ReactNode) => (
      <a href="/contrato-chefs" target="_blank" rel="noopener">
        {c}
      </a>
    ),
  };

  return (
    <section className="box flex flex-col gap-3 p-5">
      <h2 className="d m-0 text-[20px] font-normal">{title ?? t("title")}</h2>
      {intro && <p className="m-0 text-sm text-muted">{intro}</p>}
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(kinds, context);
        }}
      >
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
          <span>{t.rich(key, links)}</span>
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn" disabled={pending || !checked}>
            {pending ? t("registering") : t("accept")}
          </button>
          <FormMessage message={message} />
        </div>
      </form>
    </section>
  );
}
