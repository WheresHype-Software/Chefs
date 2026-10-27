"use client";

import { useState, useTransition } from "react";
import { saveLogistics } from "@/app/dashboard/actions";
import type { Logistics } from "@/lib/dashboard";

type Item = { name: string; active: boolean };
type Slot = { label: string; active: boolean };

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return <button type="button" className="sw" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} />;
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
      <span className="text-muted">{k}</span>
      {children}
    </div>
  );
}

const num = "w-20 border-0 border-b border-line-3 bg-transparent py-1 text-right text-sm outline-none focus:border-ink";

export function LogisticsSettings({
  initial,
  zones: initialZones,
  slots: initialSlots,
  area,
}: {
  initial: Logistics;
  zones: Item[];
  slots: Slot[];
  area: string;
}) {
  const [l, setL] = useState(initial);
  const [zones, setZones] = useState(initialZones);
  const [slots, setSlots] = useState(initialSlots);
  const [newZone, setNewZone] = useState("");
  const [newSlot, setNewSlot] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Logistics>(k: K, v: Logistics[K]) => setL((p) => ({ ...p, [k]: v }));

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveLogistics(l, zones, slots);
      setMsg(r.ok ? "Guardado." : r.error);
    });
  }

  return (
    <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-3.5">
      <div className="box flex flex-col gap-3.5 p-[22px]">
        <div className="flex items-center justify-between gap-3">
          <span className="d text-[22px]">Em casa do cliente</span>
          <Switch on={l.home_enabled} label="Aceitar serviços em casa do cliente" onToggle={() => set("home_enabled", !l.home_enabled)} />
        </div>
        {l.home_enabled && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="flex justify-between">
                <span className="lab text-muted">Raio de deslocação</span>
                <span className="num text-sm font-semibold">{l.travel_radius_km} km</span>
              </span>
              <input type="range" min={2} max={40} step={1} value={l.travel_radius_km} onChange={(e) => set("travel_radius_km", Number(e.target.value))} />
            </label>
            <div className="flex flex-col border-t border-line">
              <Row k="Grátis até (km)">
                <input className={num} inputMode="decimal" value={l.free_distance_km} onChange={(e) => set("free_distance_km", Number(e.target.value) || 0)} />
              </Row>
              <Row k="Depois, por km (€)">
                <input className={num} inputMode="decimal" value={l.fee_per_km} onChange={(e) => set("fee_per_km", Number(e.target.value.replace(",", ".")) || 0)} />
              </Row>
              <Row k="Chegada antes do serviço (min)">
                <input className={num} inputMode="numeric" value={l.arrival_minutes_before} onChange={(e) => set("arrival_minutes_before", Number(e.target.value) || 0)} />
              </Row>
            </div>
            <span className="text-[13px] text-muted">
              Aparece no mapa a clientes até {l.travel_radius_km} km de {area}
              {l.travel_radius_km > l.free_distance_km ? `, com taxa de deslocação a partir dos ${l.free_distance_km} km.` : ", sem taxa de deslocação."}
            </span>
          </div>
        )}
      </div>

      <div className="box flex flex-col gap-3.5 p-[22px]">
        <div className="flex items-center justify-between gap-3">
          <span className="d text-[22px]">Entregas</span>
          <Switch on={l.delivery_enabled} label="Fazer entregas" onToggle={() => set("delivery_enabled", !l.delivery_enabled)} />
        </div>
        {l.delivery_enabled && (
          <div className="flex flex-col gap-3">
            <span className="lab text-muted">Zonas</span>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((z, i) => (
                <button
                  key={z.name}
                  type="button"
                  className="chip"
                  aria-pressed={z.active}
                  onClick={() => setZones((zs) => zs.map((x, j) => (j === i ? { ...x, active: !x.active } : x)))}
                >
                  {z.name}
                </button>
              ))}
              <form
                className="flex"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newZone.trim()) setZones((zs) => [...zs, { name: newZone.trim(), active: true }]);
                  setNewZone("");
                }}
              >
                <label className="sr-only" htmlFor="new-zone">
                  Nova zona
                </label>
                <input id="new-zone" value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="+ freguesia" className="chip w-32 cursor-text" />
              </form>
            </div>
            <div className="flex flex-col border-t border-line">
              <Row k="Janelas">
                <input
                  className="w-44 border-0 border-b border-line-3 bg-transparent py-1 text-right text-sm outline-none focus:border-ink"
                  value={l.delivery_windows.join(" · ")}
                  onChange={(e) => set("delivery_windows", e.target.value.split("·").map((s) => s.trim()).filter(Boolean))}
                />
              </Row>
              <Row k="Taxa (€)">
                <input className={num} inputMode="decimal" value={l.delivery_fee ?? ""} onChange={(e) => set("delivery_fee", e.target.value ? Number(e.target.value.replace(",", ".")) : null)} />
              </Row>
              <Row k="Grátis acima de (€)">
                <input
                  className={num}
                  inputMode="decimal"
                  value={l.free_delivery_over ?? ""}
                  onChange={(e) => set("free_delivery_over", e.target.value ? Number(e.target.value.replace(",", ".")) : null)}
                />
              </Row>
              <Row k="Quem entrega">
                <select value={l.delivered_by} onChange={(e) => set("delivered_by", e.target.value as "chef" | "courier")} className="border-0 bg-transparent text-right text-sm">
                  <option value="chef">Eu</option>
                  <option value="courier">Estafeta</option>
                </select>
              </Row>
            </div>
          </div>
        )}
      </div>

      <div className="box flex flex-col gap-3.5 p-[22px]">
        <div className="flex items-center justify-between gap-3">
          <span className="d text-[22px]">Levantamento</span>
          <Switch on={l.pickup_enabled} label="Aceitar levantamentos" onToggle={() => set("pickup_enabled", !l.pickup_enabled)} />
        </div>
        {l.pickup_enabled && (
          <div className="flex flex-col gap-3">
            <label className="field lab">
              Morada da cozinha
              <input value={l.kitchen_address ?? ""} onChange={(e) => set("kitchen_address", e.target.value || null)} placeholder="Rua, número, código postal" />
              <span className="hint">Só é mostrada ao cliente depois de aceitar o pedido.</span>
            </label>
            <span className="lab text-muted">Horários</span>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  className="chip"
                  aria-pressed={s.active}
                  onClick={() => setSlots((ss) => ss.map((x, j) => (j === i ? { ...x, active: !x.active } : x)))}
                >
                  {s.label}
                </button>
              ))}
              <form
                className="flex"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newSlot.trim()) setSlots((ss) => [...ss, { label: newSlot.trim(), active: true }]);
                  setNewSlot("");
                }}
              >
                <label className="sr-only" htmlFor="new-slot">
                  Novo horário
                </label>
                <input id="new-slot" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} placeholder="+ 09:00–10:00" className="chip w-32 cursor-text" />
              </form>
            </div>
            <span className="text-[13px] text-muted">Cada levantamento tem um código de 4 dígitos para confirmar a entrega.</span>
          </div>
        )}
      </div>

      <button type="button" className="btn" onClick={save} disabled={pending}>
        {pending ? "A guardar…" : "Guardar logística"}
      </button>
      {msg && (
        <p role="status" className="m-0 text-sm text-muted">
          {msg}
        </p>
      )}
    </aside>
  );
}
