"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markFulfilled } from "@/app/dashboard/actions";
import { Chip } from "@/components/ui/Chip";
import { FormMessage, type FormMessageValue } from "@/components/ui/FormMessage";
import { callAction } from "@/lib/call-action";
import type { DashBooking } from "@/lib/dashboard";
import type { FulfilmentMode } from "@/lib/types";

const TYPE_LABEL: Record<FulfilmentMode, string> = { home: "Em casa do cliente", delivery: "Entrega", pickup: "Levantamento" };
const TAG: Record<FulfilmentMode, string> = {
  home: "bg-cobalt text-white",
  delivery: "border border-cobalt",
  pickup: "border border-dashed border-faint text-ink-3",
};

export function DayItems({ items, kitchenArea }: { items: DashBooking[]; kitchenArea: string }) {
  const [type, setType] = useState<FulfilmentMode | "all">("all");
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, Boolean(i.fulfilled_at)])));
  const [, start] = useTransition();
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const count = (t: FulfilmentMode) => items.filter((i) => i.fulfilment_mode === t).length;
  const shown = items.filter((i) => type === "all" || i.fulfilment_mode === type);

  function toggle(id: string) {
    const next = !done[id];
    setDone((d) => ({ ...d, [id]: next }));
    setMessage(null);
    start(async () => {
      const result = await callAction(() => markFulfilled(id, !next));
      if (!result.ok) {
        setDone((d) => ({ ...d, [id]: !next }));
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <>
      <div role="group" aria-label="Tipo" className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", "Todos", items.length],
            ["home", "Em casa", count("home")],
            ["delivery", "Entregas", count("delivery")],
            ["pickup", "Levantamentos", count("pickup")],
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
          <span className="d text-[26px]">Dia livre</span>
          <span className="text-muted">Sem serviços marcados. Pode bloquear este dia na agenda.</span>
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
                      ? "Levantado"
                      : i.fulfilment_mode === "delivery"
                        ? "Entregue"
                        : "Concluído"
                    : i.status === "confirmed"
                      ? "Sinal recebido"
                      : "Aguarda sinal"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="d text-[22px] leading-[1.15]">{i.client?.name ?? "Cliente"}</span>
                <span className="text-sm text-ink-3">
                  {i.offer_title} · {i.guests}
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3 border-t border-line pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="lab text-muted">{isPick ? "Local" : "Morada do cliente"}</span>
                  <span className="text-sm">{isPick ? `Na sua cozinha · ${kitchenArea}` : i.address}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="lab text-muted">{isPick ? "Código de levantamento" : "Distância"}</span>
                  <span className="num text-sm">
                    {isPick ? (i.pickup_code ?? "—") : i.distance_km ? `${String(i.distance_km).replace(".", ",")} km` : "—"}
                  </span>
                </div>
              </div>
              {i.notes && <span className="rounded-[2px] bg-paper px-3 py-2.5 text-sm text-ink-3">{i.notes}</span>}
              <div className="flex flex-wrap gap-1.5">
                {maps && (
                  <a href={maps} target="_blank" rel="noopener" className="btn btn-sm btn-o">
                    Abrir no Maps
                  </a>
                )}
                <Link href={`/dashboard/pedidos/${i.id}`} className="btn btn-sm btn-o">
                  Mensagem
                </Link>
                <button type="button" className="btn btn-sm" onClick={() => toggle(i.id)}>
                  {isDone
                    ? "Desfazer"
                    : isPick
                      ? "Marcar levantado"
                      : i.fulfilment_mode === "delivery"
                        ? "Marcar entregue"
                        : "Marcar concluído"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}
