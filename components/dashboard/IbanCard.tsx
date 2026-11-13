"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { requestIbanChange } from "@/app/dashboard/actions/billing";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { ChefBilling } from "@/lib/dashboard";
import { formatIban, isValidIban, normaliseIban } from "@/lib/fiscal";

type Props = { billing: ChefBilling | null; holderSuggestion: string };

/**
 * Where the money goes. Deliberately awkward to change: a new IBAN is only parked here until the
 * chef opens a link sent to their email, and transfers wait 72 hours after that. An account that
 * is taken over should not be able to redirect a payout before anyone notices.
 */
export function IbanCard({ billing, holderSuggestion }: Props) {
  const t = useTranslations("dashboard.billing.iban");
  const [open, setOpen] = useState(false);
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState(billing?.iban_holder ?? holderSuggestion);
  const [bic, setBic] = useState("");
  const { run, pending, message } = useServerAction(requestIbanChange, {
    successMessage: t("requested"),
    onSuccess: () => {
      setOpen(false);
      setIban("");
    },
  });

  const typed = normaliseIban(iban);
  const looksValid = typed.length > 14 && isValidIban(typed);
  const pendingChange = billing?.iban_pending_last4;

  return (
    <section className="box flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="d m-0 text-2xl font-normal">{t("title")}</h2>
        <p className="m-0 text-sm text-muted">{t("intro")}</p>
      </div>

      <dl className="m-0 flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="lab m-0 text-muted">{t("current")}</dt>
          <dd className="num m-0 text-lg">{billing?.iban_last4 ? `•••• ${billing.iban_last4}` : t("notGiven")}</dd>
        </div>
        {billing?.iban_holder && (
          <div>
            <dt className="lab m-0 text-muted">{t("holder")}</dt>
            <dd className="m-0 text-lg">{billing.iban_holder}</dd>
          </div>
        )}
        {billing?.iban_last4 && (
          <div>
            <dt className="lab m-0 text-muted">{t("status")}</dt>
            <dd className="m-0 text-lg">{billing.iban_approved_at ? t("verified") : t("awaiting")}</dd>
          </div>
        )}
      </dl>

      {pendingChange && <p className="m-0 border-l-2 border-line-2 pl-3 text-sm text-muted">{t("pendingChange", { last4: pendingChange })}</p>}

      {!open ? (
        <button type="button" className="btn btn-o btn-sm self-start" onClick={() => setOpen(true)}>
          {billing?.iban_last4 ? t("change") : t("give")}
        </button>
      ) : (
        <form
          className="flex flex-col gap-4 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            run({ iban: typed, holder, bic: bic || undefined });
          }}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
            <Field
              label={t("iban")}
              required
              hint={typed.length > 8 ? (looksValid ? formatIban(typed) : t("invalid")) : "PT50 …"}
            >
              <input required maxLength={42} value={iban} onChange={(e) => setIban(e.target.value)} autoComplete="off" />
            </Field>
            <Field label={t("holderLabel")} required hint={t("holderHint")}>
              <input required maxLength={160} value={holder} onChange={(e) => setHolder(e.target.value)} />
            </Field>
            <Field label={t("bic")} hint={t("bicHint")}>
              <input maxLength={11} value={bic} onChange={(e) => setBic(e.target.value.toUpperCase())} />
            </Field>
          </div>
          <p className="m-0 max-w-[62ch] text-sm text-muted">{t("security")}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn" disabled={pending || !looksValid}>
              {pending ? t("sending") : t("send")}
            </button>
            <button type="button" className="btn btn-o btn-sm" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </button>
            <FormMessage message={message} />
          </div>
        </form>
      )}
      {!open && <FormMessage message={message} />}
    </section>
  );
}
