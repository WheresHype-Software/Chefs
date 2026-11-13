"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { contactPhone, whatsappLink } from "@/lib/contact";
import { useRouter } from "@/lib/i18n/navigation";
import { useState, useTransition } from "react";
import { markFulfilled } from "@/app/dashboard/actions/agenda";
import { Chip } from "@/components/ui/Chip";
import { FormMessage, type FormMessageValue } from "@/components/ui/FormMessage";
import { chefUpdateBooking } from "@/lib/bookings";
import { callAction } from "@/lib/call-action";
import type { DashBooking } from "@/lib/dashboard";
import { isoDay } from "@/lib/format";
import type { FulfilmentMode } from "@/lib/types";

const TAG: Record<FulfilmentMode, string> = {
  home: "bg-cobalt text-white",
  delivery: "border border-cobalt",
  pickup: "border border-dashed border-faint text-ink-3",
};

export function DayItems({ items, kitchenArea }: { items: DashBooking[]; kitchenArea: string }) {
  const t = useTranslations("dashboard.logistics.day");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const TYPE_LABEL: Record<FulfilmentMode, string> = { home: t("typeHome"), delivery: t("typeDelivery"), pickup: t("typePickup") };
  const [type, setType] = useState<FulfilmentMode | "all">("all");
  const router = useRouter();
  // A booking completed in Pedidos is done here too, and stays done.
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, Boolean(i.fulfilled_at) || i.status === "completed"])),
  );
  const [, start] = useTransition();
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const count = (t: FulfilmentMode) => items.filter((i) => i.fulfilment_mode === t).length;
  const shown = items.filter((i) => type === "all" || i.fulfilment_mode === type);

  function toggle(id: string) {
    const next = !done[id];
    setDone((d) => ({ ...d, [id]: next }));
    setMessage(null);
    const item = items.find((i) => i.id === id);
    // Done on or after the service day completes the booking too, so the client gets the review request.
    const complete = next && item?.status === "confirmed" && item.date <= isoDay(new Date());
    start(async () => {
      const result = await callAction(() => markFulfilled(id, !next));
      if (!result.ok) {
        setDone((d) => ({ ...d, [id]: !next }));
        setMessage({ ok: false, text: result.error });
        return;
      }
      if (complete) {
        const completed = await chefUpdateBooking(id, { status: "completed" });
        if (!completed.ok) setMessage({ ok: false, text: completed.error });
        router.refresh();
      }
    });
  }

  return (
    <>
      <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", t("all"), items.length],
            ["home", t("home"), count("home")],
            ["delivery", t("delivery"), count("delivery")],
            ["pickup", t("pickup"), count("pickup")],
          ] as [FulfilmentMode | "all", string, number][]
        ).map(([k, label, n]) => (
          <Chip key={k} pressed={type === k} onClick={() => setType(k)}>
            {label} · {n}
          </Chip>
        ))}
      </div>

      <FormMessage message={message} />

      {shown.length === 0 && (
        <div className="box flex flex-col gap-1.5 px-6 py-10 text-center">
          <span className="d text-[26px]">{t("freeDay")}</span>
          <span className="text-muted">{t("freeDayText")}</span>
        </div>
      )}

      {shown.map((i) => {
        const isPick = i.fulfilment_mode === "pickup";
        const isDone = done[i.id];
        const maps = i.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(i.address)}` : null;
        return (
          <article key={i.id} className={`box al-in flex flex-wrap transition-opacity duration-400 ${isDone ? "opacity-45" : ""}`}>
            <div className="flex flex-[0_0_96px] flex-col gap-1 py-5 pl-5">
              <span className="d num text-[26px] leading-none">{i.time_label?.replace(/^\D+/, "") ?? "—"}</span>
            </div>
            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 border-l border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`lab rounded-[2px] px-[9px] py-[5px] ${TAG[i.fulfilment_mode]}`}>{TYPE_LABEL[i.fulfilment_mode]}</span>
                <span className="lab text-muted">
                  {isDone
                    ? isPick
                      ? t("pickedUp")
                      : i.fulfilment_mode === "delivery"
                        ? t("delivered")
                        : t("done")
                    : i.status === "confirmed"
                      ? t("depositReceived")
                      : t("awaitingDeposit")}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="d text-[22px] leading-[1.15]">{i.client?.name ?? td("client")}</span>
                <span className="text-sm text-ink-3">
                  {i.offer_title} · {i.guests}
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3 border-t border-line pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="lab text-muted">{isPick ? t("place") : t("clientAddress")}</span>
                  <span className="text-sm">{isPick ? t("atKitchen", { area: kitchenArea }) : i.address}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="lab text-muted">{isPick ? t("pickupCode") : t("distance")}</span>
                  <span className="num text-sm">
                    {isPick ? (i.pickup_code ?? "—") : i.distance_km ? `${String(i.distance_km).replace(".", locale === "pt" ? "," : ".")} km` : "—"}
                  </span>
                </div>
              </div>
              {i.notes && <span className="rounded-[2px] bg-paper px-3 py-2.5 text-sm text-ink-3">{i.notes}</span>}
              <div className="flex flex-wrap gap-1.5">
                {maps && (
                  <a href={maps} target="_blank" rel="noopener" className="btn btn-sm btn-o">
                    {t("openMaps")}
                  </a>
                )}
                {(() => {
                  const p = contactPhone(i.client?.phone);
                  return p ? (
                    <>
                      <a href={`tel:${p.tel}`} className="btn btn-sm btn-o">
                        {t("call")}
                      </a>
                      <a
                        href={whatsappLink(
                          p,
                          td("contact.greeting", {
                            hasName: i.client?.name ? "yes" : "no",
                            name: i.client?.name ? i.client.name.split(" ")[0]! : "",
                            hasRef: "yes",
                            ref: i.ref,
                          }),
                        )}
                        target="_blank"
                        rel="noopener"
                        className="btn btn-sm btn-o"
                      >
                        {t("whatsapp")}
                      </a>
                    </>
                  ) : null;
                })()}
                <Link href={`/dashboard/pedidos/${i.id}`} className="btn btn-sm btn-o">
                  {t("message")}
                </Link>
                {i.status !== "completed" && (
                  <button type="button" className="btn btn-sm" onClick={() => toggle(i.id)}>
                    {isDone
                      ? t("undo")
                      : isPick
                        ? t("markPickedUp")
                        : i.fulfilment_mode === "delivery"
                          ? t("markDelivered")
                          : t("markDone")}
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}
