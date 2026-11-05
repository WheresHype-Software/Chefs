"use client";

import { useState } from "react";
import { saveSettings } from "@/app/admin/pagamentos/actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { Switch } from "@/components/ui/Switch";
import { useServerAction } from "@/hooks/useServerAction";
import { euro } from "@/lib/format";
import type { PlatformSettings } from "@/lib/settings";

/**
 * The numbers that decide how much money moves. Changing one is a business decision, so it needs
 * a reason and it lands in admin_logs with the values before and after.
 *
 * The preview underneath is not decoration: a commission percentage is abstract until you see
 * what a real dinner would pay.
 */
export function PaymentSettingsForm({ settings, envEnabled }: { settings: PlatformSettings; envEnabled: boolean }) {
  const [form, setForm] = useState({ ...settings });
  const [reason, setReason] = useState("");
  const { run, pending, message } = useServerAction(saveSettings, { successMessage: "Definições guardadas." });
  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  // A 300 € dinner at the minimum signal this setting allows.
  const minDeposit = Math.ceil(form.commissionPercent + form.depositMarginPercent);
  const deposit = Math.round(300 * minDeposit) / 100;
  const commission = Math.max(Math.round(300 * form.commissionPercent) / 100, form.commissionMin);

  return (
    <section id="definicoes" className="box flex flex-col gap-4 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">Definições</h2>

      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex flex-col">
          <span className="font-semibold">Pagamentos ligados</span>
          <span className="text-sm text-muted">
            {envEnabled
              ? "O interruptor do servidor está ligado; este decide o resto."
              : "PAYMENTS_ENABLED está desligado no servidor: nada se move, ligue-o aí primeiro."}
          </span>
        </div>
        <Switch checked={form.paymentsEnabled} label="Pagamentos ligados" onChange={(v) => set("paymentsEnabled", v)} />
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          run({
            payments_enabled: form.paymentsEnabled,
            commission_percent: form.commissionPercent,
            commission_min: form.commissionMin,
            deposit_margin_percent: form.depositMarginPercent,
            deposit_due_hours: form.depositDueHours,
            payout_hold_hours: form.payoutHoldHours,
            reason,
          });
        }}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-4">
          <Field label="Comissão (%)">
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={form.commissionPercent}
              onChange={(e) => set("commissionPercent", Number(e.target.value))}
            />
          </Field>
          <Field label="Comissão mínima (€)">
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.commissionMin}
              onChange={(e) => set("commissionMin", Number(e.target.value))}
            />
          </Field>
          <Field label="Margem do sinal (pontos)" hint="O sinal do chef tem de ser pelo menos comissão + esta margem.">
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={form.depositMarginPercent}
              onChange={(e) => set("depositMarginPercent", Number(e.target.value))}
            />
          </Field>
          <Field label="Prazo para pagar o sinal (h)">
            <input
              type="number"
              step="1"
              min="1"
              max="720"
              value={form.depositDueHours}
              onChange={(e) => set("depositDueHours", Number(e.target.value))}
            />
          </Field>
          <Field label="Retenção antes de pagar ao chef (h)">
            <input
              type="number"
              step="1"
              min="0"
              max="2160"
              value={form.payoutHoldHours}
              onChange={(e) => set("payoutHoldHours", Number(e.target.value))}
            />
          </Field>
        </div>

        <p className="m-0 rounded-[2px] bg-paper p-3.5 text-sm">
          Num jantar de <strong className="num">300 €</strong> com o sinal mínimo ({minDeposit}%): o cliente paga{" "}
          <strong className="num">{euro(deposit)}</strong>, ficamos com <strong className="num">{euro(commission)}</strong> e o chef recebe{" "}
          <strong className="num">{euro(Math.max(0, deposit - commission))}</strong>.
        </p>

        <Field label="Motivo da alteração" required>
          <input required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <button className="btn btn-sm" disabled={pending || reason.trim().length < 3}>
            {pending ? "A guardar…" : "Guardar definições"}
          </button>
          <FormMessage message={message} />
        </div>
      </form>
    </section>
  );
}
