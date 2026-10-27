"use client";

import { useState, type ReactNode } from "react";
import { saveLogistics } from "@/app/dashboard/actions";
import { ToggleChipList, type ToggleItem } from "@/components/dashboard/ToggleChipList";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { Switch } from "@/components/ui/Switch";
import { useServerAction } from "@/hooks/useServerAction";
import type { Logistics } from "@/lib/dashboard";

type Props = { initial: Logistics; zones: ToggleItem[]; slots: ToggleItem[]; area: string };

const toNumber = (v: string) => Number(v.replace(",", "."));
const numberInput = "w-20 border-0 border-b border-line-3 bg-transparent py-1 text-right text-sm outline-none focus:border-ink";

/** A titled card with an on/off switch; its body shows only when switched on. */
function ToggleCard({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className="box flex flex-col gap-3.5 p-[22px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="d m-0 text-[22px] font-normal">{title}</h2>
        <Switch checked={enabled} label={title} onChange={onToggle} />
      </div>
      {enabled && <div className="flex flex-col gap-3">{children}</div>}
    </section>
  );
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

export function LogisticsSettings({ initial, zones: initialZones, slots: initialSlots, area }: Props) {
  const [settings, setSettings] = useState(initial);
  const [zones, setZones] = useState(initialZones);
  const [slots, setSlots] = useState(initialSlots);
  const { run, pending, message } = useServerAction(saveLogistics, { successMessage: "Guardado." });
  const set = <K extends keyof Logistics>(key: K, value: Logistics[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const s = settings;

  return (
    <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-3.5">
      <ToggleCard title="Em casa do cliente" enabled={s.home_enabled} onToggle={(v) => set("home_enabled", v)}>
        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between">
            <span className="lab text-muted">Raio de deslocação</span>
            <span className="num text-sm font-semibold">{s.travel_radius_km} km</span>
          </span>
          <input
            type="range"
            min={2}
            max={40}
            step={1}
            value={s.travel_radius_km}
            onChange={(e) => set("travel_radius_km", Number(e.target.value))}
          />
        </label>
        <div className="flex flex-col border-t border-line">
          <SettingRow label="Grátis até (km)">
            <input
              className={numberInput}
              inputMode="decimal"
              value={s.free_distance_km}
              onChange={(e) => set("free_distance_km", toNumber(e.target.value) || 0)}
            />
          </SettingRow>
          <SettingRow label="Depois, por km (€)">
            <input
              className={numberInput}
              inputMode="decimal"
              value={s.fee_per_km}
              onChange={(e) => set("fee_per_km", toNumber(e.target.value) || 0)}
            />
          </SettingRow>
          <SettingRow label="Chegada antes do serviço (min)">
            <input
              className={numberInput}
              inputMode="numeric"
              value={s.arrival_minutes_before}
              onChange={(e) => set("arrival_minutes_before", Number(e.target.value) || 0)}
            />
          </SettingRow>
        </div>
        <span className="text-[13px] text-muted">
          Aparece a clientes até {s.travel_radius_km} km de {area}
          {s.travel_radius_km > s.free_distance_km
            ? `, com taxa de deslocação a partir dos ${s.free_distance_km} km.`
            : ", sem taxa de deslocação."}
        </span>
      </ToggleCard>

      <ToggleCard title="Entregas" enabled={s.delivery_enabled} onToggle={(v) => set("delivery_enabled", v)}>
        <span className="lab text-muted">Zonas</span>
        <ToggleChipList items={zones} onChange={setZones} addLabel="Nova zona" addPlaceholder="+ freguesia" />
        <div className="flex flex-col border-t border-line">
          <SettingRow label="Janelas">
            <input
              className="w-44 border-0 border-b border-line-3 bg-transparent py-1 text-right text-sm outline-none focus:border-ink"
              value={s.delivery_windows.join(" · ")}
              onChange={(e) =>
                set(
                  "delivery_windows",
                  e.target.value
                    .split("·")
                    .map((w) => w.trim())
                    .filter(Boolean),
                )
              }
            />
          </SettingRow>
          <SettingRow label="Taxa (€)">
            <input
              className={numberInput}
              inputMode="decimal"
              value={s.delivery_fee ?? ""}
              onChange={(e) => set("delivery_fee", e.target.value ? toNumber(e.target.value) : null)}
            />
          </SettingRow>
          <SettingRow label="Grátis acima de (€)">
            <input
              className={numberInput}
              inputMode="decimal"
              value={s.free_delivery_over ?? ""}
              onChange={(e) => set("free_delivery_over", e.target.value ? toNumber(e.target.value) : null)}
            />
          </SettingRow>
          <SettingRow label="Quem entrega">
            <select
              value={s.delivered_by}
              onChange={(e) => set("delivered_by", e.target.value as Logistics["delivered_by"])}
              className="border-0 bg-transparent text-right text-sm"
            >
              <option value="chef">Eu</option>
              <option value="courier">Estafeta</option>
            </select>
          </SettingRow>
        </div>
      </ToggleCard>

      <ToggleCard title="Levantamento" enabled={s.pickup_enabled} onToggle={(v) => set("pickup_enabled", v)}>
        <Field label="Morada da cozinha" hint="Só é mostrada ao cliente depois de aceitar o pedido.">
          <input
            value={s.kitchen_address ?? ""}
            maxLength={300}
            onChange={(e) => set("kitchen_address", e.target.value || null)}
            placeholder="Rua, número, código postal"
          />
        </Field>
        <span className="lab text-muted">Horários</span>
        <ToggleChipList items={slots} onChange={setSlots} addLabel="Novo horário" addPlaceholder="+ 09:00–10:00" />
        <span className="text-[13px] text-muted">Cada levantamento tem um código de 4 dígitos para confirmar a entrega.</span>
      </ToggleCard>

      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          run(
            s,
            zones.map((z) => ({ name: z.label, active: z.active })),
            slots,
          )
        }
      >
        {pending ? "A guardar…" : "Guardar logística"}
      </button>
      <FormMessage message={message} />
    </aside>
  );
}
