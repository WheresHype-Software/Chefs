"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { chefUpdateBooking } from "@/lib/bookings";
import { dayLabel, euro, isoDay } from "@/lib/format";
import { type Locale } from "@/lib/i18n/routing";
import type { BookingStatus, DepositStatus } from "@/lib/types";

type Panel = null | "decline" | "propose";

/** The chef's next steps for a booking, depending on its status. */
export function RequestActions({
  id,
  status,
  date,
  depositStatus = "not_required",
  needsPrice = false,
  minQuote = null,
}: {
  id: string;
  status: BookingStatus;
  date: string;
  /** Quando o sinal é pago na app, quem confirma a reserva é o pagamento, não o chef. */
  depositStatus?: DepositStatus;
  /** Sob orçamento: the request has no value yet, so the chef answers with a quote, not "Aceitar". */
  needsPrice?: boolean;
  /** Smallest quote the signal can carry the minimum commission on (payments on). */
  minQuote?: number | null;
}) {
  const t = useTranslations("dashboard.requests.actions");
  const locale = useLocale() as Locale;
  const awaitingDeposit = depositStatus === "due" || depositStatus === "pending" || depositStatus === "overdue";
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [proposal, setProposal] = useState({ date: "", time: "", price: "" });
  const { run, pending, message } = useServerAction(chefUpdateBooking, { onSuccess: () => setPanel(null) });
  const toggle = (p: Panel) => setPanel((current) => (current === p ? null : p));

  const price = proposal.price ? Number(proposal.price.replace(",", ".")) : undefined;
  const priceOk = price != null && Number.isFinite(price) && price > 0 && (minQuote == null || price >= minQuote);

  function sendProposal() {
    run(id, {
      status: "change_proposed",
      proposed_date: proposal.date || undefined,
      proposed_time: proposal.time || undefined,
      quoted_price: Number.isFinite(price) ? price : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {status === "requested" && (
          <>
            {needsPrice ? (
              <button type="button" className="btn btn-sm" disabled={pending} onClick={() => toggle("propose")}>
                {t("sendQuote")}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, { status: "accepted" })}>
                  {t("accept")}
                </button>
                <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => toggle("propose")}>
                  {t("proposeChange")}
                </button>
              </>
            )}
            <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => toggle("decline")}>
              {t("decline")}
            </button>
          </>
        )}
        {/* Com o sinal a ser pago na app, o guard na base de dados recusa esta passagem até o
            pagamento entrar. Mostrar o botão era convidar o chef a carregar e levar um erro. */}
        {status === "accepted" &&
          (awaitingDeposit ? (
            <span className="order-last w-full text-[13px] text-muted">{t("confirmsItself")}</span>
          ) : (
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, { status: "confirmed" })}>
              {t("depositReceived")}
            </button>
          ))}
        {status === "confirmed" &&
          // Completing unlocks the client's review, so it waits for the service day.
          (date <= isoDay(new Date()) ? (
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, { status: "completed" })}>
              {t("markCompleted")}
            </button>
          ) : (
            <span className="order-last w-full text-[13px] text-muted">{t("completableFrom", { date: dayLabel(date, locale) })}</span>
          ))}
        {(status === "accepted" || status === "confirmed" || status === "change_proposed") && (
          <button
            type="button"
            className="btn btn-sm btn-o !border-line-2 !text-danger"
            disabled={pending}
            onClick={() => confirm(t("confirmCancel")) && run(id, { status: "cancelled" })}
          >
            {t("cancel")}
          </button>
        )}
      </div>

      {panel === "decline" && (
        <div className="flex flex-col gap-3 rounded-[2px] bg-paper p-4">
          <Field label={t("declineReason")}>
            <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder={t("declinePlaceholder")} />
          </Field>
          <button
            type="button"
            className="btn btn-sm self-start"
            disabled={pending}
            onClick={() => run(id, { status: "declined", decline_reason: reason || undefined })}
          >
            {t("declineRequest")}
          </button>
        </div>
      )}

      {panel === "propose" && needsPrice && (
        <div className="flex flex-col gap-3 rounded-[2px] bg-paper p-4">
          <p className="m-0 text-sm text-ink-3">{t("quoteIntro")}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-3.5">
            <Field label={t("totalValue")} hint={minQuote ? t("minimum", { amount: euro(minQuote, locale) }) : undefined}>
              <input
                inputMode="decimal"
                required
                autoFocus
                value={proposal.price}
                onChange={(e) => setProposal((p) => ({ ...p, price: e.target.value }))}
                placeholder="250"
              />
            </Field>
            <Field label={t("otherDate")}>
              <input type="date" value={proposal.date} onChange={(e) => setProposal((p) => ({ ...p, date: e.target.value }))} />
            </Field>
            <Field label={t("timeOptional")}>
              <input value={proposal.time} onChange={(e) => setProposal((p) => ({ ...p, time: e.target.value }))} placeholder="20:00" />
            </Field>
          </div>
          <button type="button" className="btn btn-sm self-start" disabled={pending || !priceOk} onClick={sendProposal}>
            {t("sendQuoteToClient")}
          </button>
        </div>
      )}

      {panel === "propose" && !needsPrice && (
        <div className="flex flex-col gap-3 rounded-[2px] bg-paper p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-3.5">
            <Field label={t("newDate")}>
              <input type="date" value={proposal.date} onChange={(e) => setProposal((p) => ({ ...p, date: e.target.value }))} />
            </Field>
            <Field label={t("time")}>
              <input value={proposal.time} onChange={(e) => setProposal((p) => ({ ...p, time: e.target.value }))} placeholder="20:00" />
            </Field>
            <Field label={t("quoteValue")}>
              <input
                inputMode="decimal"
                value={proposal.price}
                onChange={(e) => setProposal((p) => ({ ...p, price: e.target.value }))}
                placeholder={t("optional")}
              />
            </Field>
          </div>
          <button
            type="button"
            className="btn btn-sm self-start"
            disabled={pending || (!proposal.date && !proposal.time && !proposal.price)}
            onClick={sendProposal}
          >
            {t("sendProposal")}
          </button>
        </div>
      )}

      <FormMessage message={message} />
    </div>
  );
}
