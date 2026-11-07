import "server-only";
import { cache } from "react";
import type { MoneyRules } from "./money";
import { toCents } from "./money";
import { createAnonClient, createClient, hasSupabase } from "./supabase/server";

/** The one row of `platform_settings`, in the shapes the app uses. */
export type PlatformSettings = {
  paymentsEnabled: boolean;
  commissionPercent: number;
  commissionMin: number;
  depositMarginPercent: number;
  depositDueHours: number;
  payoutHoldHours: number;
  /** Horas de retenção depois de o chef confirmar uma alteração de IBAN. */
  ibanHoldHours: number;
  /** Aplicar essa retenção também ao primeiro IBAN, quando não havia nenhum para desviar. */
  ibanHoldFirstTime: boolean;
  agreementVersion: number;
};

/** What a fresh database starts with; also what demo mode shows. */
export const DEFAULT_SETTINGS: PlatformSettings = {
  paymentsEnabled: false,
  commissionPercent: 12,
  commissionMin: 3,
  depositMarginPercent: 5,
  depositDueHours: 48,
  payoutHoldHours: 48,
  ibanHoldHours: 72,
  ibanHoldFirstTime: false,
  agreementVersion: 1,
};

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  if (!hasSupabase) return { ...DEFAULT_SETTINGS, paymentsEnabled: true };
  const sb = await createClient();
  const { data } = await sb
    .from("platform_settings")
    .select(
      "payments_enabled, commission_percent, commission_min, deposit_margin_percent, deposit_due_hours, payout_hold_hours, iban_hold_hours, iban_hold_first_time, agreement_version",
    )
    .eq("id", 1)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    paymentsEnabled: data.payments_enabled,
    commissionPercent: Number(data.commission_percent),
    commissionMin: Number(data.commission_min),
    depositMarginPercent: Number(data.deposit_margin_percent),
    depositDueHours: data.deposit_due_hours,
    payoutHoldHours: data.payout_hold_hours,
    ibanHoldHours: data.iban_hold_hours,
    ibanHoldFirstTime: data.iban_hold_first_time,
    agreementVersion: data.agreement_version,
  };
});

/**
 * The same settings, read without a session, so a public page can state the commission without
 * becoming dynamic on every request. Pages that use it should set their own revalidate window.
 */
export const getPublicSettings = cache(async (): Promise<PlatformSettings> => {
  if (!hasSupabase) return DEFAULT_SETTINGS;
  const { data } = await createAnonClient()
    .from("platform_settings")
    .select(
      "payments_enabled, commission_percent, commission_min, deposit_margin_percent, deposit_due_hours, payout_hold_hours, iban_hold_hours, iban_hold_first_time, agreement_version",
    )
    .eq("id", 1)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    paymentsEnabled: data.payments_enabled,
    commissionPercent: Number(data.commission_percent),
    commissionMin: Number(data.commission_min),
    depositMarginPercent: Number(data.deposit_margin_percent),
    depositDueHours: data.deposit_due_hours,
    payoutHoldHours: data.payout_hold_hours,
    ibanHoldHours: data.iban_hold_hours,
    ibanHoldFirstTime: data.iban_hold_first_time,
    agreementVersion: data.agreement_version,
  };
});

/**
 * Whether money actually moves.
 *
 * One switch, and it is the row in the database. There used to be a second one in the
 * environment, meant as a deploy-level kill switch — but the rules that decide money are database
 * triggers, and a trigger cannot read an environment variable. The two could disagree, and when
 * they did the result was a booking whose signal was owed, could not be paid, and could not be
 * confirmed. A safety mechanism that fails that way is not one.
 */
export async function paymentsLive(): Promise<boolean> {
  if (!hasSupabase) return true; // demo mode shows the flow without touching anything
  return (await getSettings()).paymentsEnabled;
}

export function moneyRules(s: PlatformSettings): MoneyRules {
  return {
    commissionPercent: s.commissionPercent,
    commissionMinCents: toCents(s.commissionMin),
    depositMarginPercent: s.depositMarginPercent,
  };
}
