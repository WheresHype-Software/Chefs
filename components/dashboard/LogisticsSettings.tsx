"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { saveLogistics } from "@/app/dashboard/actions/logistics";
import { ToggleChipList, type ToggleItem } from "@/components/dashboard/ToggleChipList";
import { NumberInput } from "@/components/ui/NumberInput";
import { FormMessage } from "@/components/ui/FormMessage";
import { Switch } from "@/components/ui/Switch";
import { useServerAction } from "@/hooks/useServerAction";
import type { Logistics } from "@/lib/dashboard";

type Props = { initial: Logistics; zones: ToggleItem[]; slots: ToggleItem[]; area: string };

const parseWindows = (text: string) =>
  text
    .split(/[·,;]/)
    .map((w) => w.trim())
    .filter(Boolean);
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
  const t = useTranslations("dashboard.logistics.settings");
  const [settings, setSettings] = useState(initial);
  const [zones, setZones] = useState(initialZones);
  const [slots, setSlots] = useState(initialSlots);
  // Free text while typing; split into windows only when saving.
  const [windows, setWindows] = useState(initial.delivery_windows.join(", "));
  const { run, pending, message } = useServerAction(saveLogistics, { successMessage: t("saved") });
  const set = <K extends keyof Logistics>(key: K, value: Logistics[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const s = settings;

  return (
    <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-3.5">
      <ToggleCard title={t("homeTitle")} enabled={s.home_enabled} onToggle={(v) => set("home_enabled", v)}>
        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between">
            <span className="lab text-muted">{t("radius")}</span>
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
        {/* Travel fees and arrival time are agreed with each client for now; the saved values are kept. */}
        <span className="text-[13px] text-muted">{t("radiusNote", { km: s.travel_radius_km, area })}</span>
      </ToggleCard>

      <ToggleCard title={t("deliveries")} enabled={s.delivery_enabled} onToggle={(v) => set("delivery_enabled", v)}>
        <span className="lab text-muted">{t("zones")}</span>
        <ToggleChipList items={zones} onChange={setZones} addLabel={t("newZone")} addPlaceholder={t("zonePlaceholder")} />
        <div className="flex flex-col border-t border-line">
          <SettingRow label={t("windows")}>
            <input
              className="w-full min-w-0 max-w-44 border-0 border-b border-line-3 bg-transparent py-1 text-right text-sm outline-none focus:border-ink"
              value={windows}
              onChange={(e) => setWindows(e.target.value)}
              placeholder="12:00-14:00, 19:00-21:00"
            />
          </SettingRow>
          <SettingRow label={t("fee")}>
            <NumberInput className={numberInput} decimal min={0} value={s.delivery_fee} onChange={(v) => set("delivery_fee", v)} />
          </SettingRow>
          <SettingRow label={t("freeOver")}>
            <NumberInput
              className={numberInput}
              decimal
              min={0}
              value={s.free_delivery_over}
              onChange={(v) => set("free_delivery_over", v)}
            />
          </SettingRow>
          <SettingRow label={t("whoDelivers")}>
            <select
              value={s.delivered_by}
              onChange={(e) => set("delivered_by", e.target.value as Logistics["delivered_by"])}
              className="border-0 bg-transparent text-right text-sm"
            >
              <option value="chef">{t("me")}</option>
              <option value="courier">{t("courier")}</option>
            </select>
          </SettingRow>
        </div>
      </ToggleCard>

      <ToggleCard title={t("pickup")} enabled={s.pickup_enabled} onToggle={(v) => set("pickup_enabled", v)}>
        {/* The kitchen address isn't asked for here for now: the chef gives it to the client when the order is ready. */}
        <span className="lab text-muted">{t("hours")}</span>
        <ToggleChipList items={slots} onChange={setSlots} addLabel={t("newSlot")} addPlaceholder="+ 09:00–10:00" />
        <span className="text-[13px] text-muted">{t("pickupNote")}</span>
      </ToggleCard>

      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          run(
            { ...s, delivery_windows: parseWindows(windows) },
            zones.map((z) => ({ name: z.label, active: z.active })),
            slots,
          )
        }
      >
        {pending ? t("saving") : t("save")}
      </button>
      <FormMessage message={message} />
    </aside>
  );
}
