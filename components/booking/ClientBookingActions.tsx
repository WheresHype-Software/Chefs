"use client";

import { useTranslations } from "next-intl";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { clientAction } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

const CANCELLABLE: BookingStatus[] = ["requested", "accepted", "change_proposed", "confirmed"];

/** Cancel, or accept the chef's proposed change, from the booking status page. */
export function ClientBookingActions({ id, status, quote = false }: { id: string; status: BookingStatus; quote?: boolean }) {
  const t = useTranslations("booking.actions");
  const { run, pending, message } = useServerAction(clientAction);
  if (!CANCELLABLE.includes(status)) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        {status === "change_proposed" && (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(id, "accept_proposal")}>
            {quote ? t("acceptQuote") : t("acceptProposal")}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-o !border-line-2 !text-danger"
          disabled={pending}
          onClick={() => confirm(t("cancelConfirm")) && run(id, "cancel")}
        >
          {t("cancel")}
        </button>
      </div>
      <FormMessage message={message} />
    </div>
  );
}
