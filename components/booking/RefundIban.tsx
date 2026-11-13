"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { submitRefundIban, type PendingRefund } from "@/lib/deposit";
import { formatIban, isValidIban, normaliseIban } from "@/lib/fiscal";
import { euro } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";

/**
 * Asking a client for their IBAN, in the one place where that question is safe to ask: their own
 * booking page, which they reached with their own link. The card says so out loud, because the
 * same request arriving by email or phone is what a scam looks like.
 */
export function RefundIban({ bookingId, refund }: { bookingId: string; refund: PendingRefund }) {
  const t = useTranslations("booking.refund");
  const locale = useLocale() as Locale;
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");
  const [done, setDone] = useState(false);
  const { run, pending, message } = useServerAction(submitRefundIban, {
    successMessage: t("success"),
    onSuccess: () => setDone(true),
  });

  const typed = normaliseIban(iban);
  const valid = typed.length > 14 && isValidIban(typed);

  if (done) {
    return (
      <section className="box flex flex-col gap-2 p-6">
        <h2 className="d m-0 text-[28px]">{t("doneTitle")}</h2>
        <p className="m-0 text-muted">{t("doneText", { amount: euro(refund.amount, locale) })}</p>
      </section>
    );
  }

  return (
    <section className="box flex flex-col gap-4 border-2 border-cobalt p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="d m-0 text-[28px]">{t("title", { amount: euro(refund.amount, locale) })}</h2>
        <p className="m-0 text-muted">{t("why", { reason: refund.reason })}</p>
      </div>

      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          run(bookingId, { refundId: refund.id, iban: typed, holder });
        }}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
          <Field label={t("iban")} required hint={typed.length > 8 ? (valid ? formatIban(typed) : t("ibanInvalid")) : t("ibanPlaceholder")}>
            <input required maxLength={42} value={iban} onChange={(e) => setIban(e.target.value)} autoComplete="off" />
          </Field>
          <Field label={t("holder")} required>
            <input required maxLength={160} value={holder} onChange={(e) => setHolder(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn" disabled={pending || !valid}>
            {pending ? t("saving") : t("submit")}
          </button>
          <FormMessage message={message} />
        </div>
      </form>

      <p className="m-0 text-xs text-muted">{t("warning")}</p>
    </section>
  );
}
