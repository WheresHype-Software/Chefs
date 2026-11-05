import "server-only";
import { cache } from "react";
import { serverEnv } from "./env.server";
import type { MoneyRules } from "./money";
import { toCents } from "./money";
import { createClient, hasSupabase } from "./supabase/server";

/** The one row of `platform_settings`, in the shapes the app uses. */
export type PlatformSettings = {
  paymentsEnabled: boolean;
  commissionPercent: number;
  commissionMin: number;
  depositMarginPercent: number;
  depositDueHours: number;
  payoutHoldHours: number;
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
  agreementVersion: 1,
};

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  if (!hasSupabase) return { ...DEFAULT_SETTINGS, paymentsEnabled: true };
  const sb = await createClient();
  const { data } = await sb
    .from("platform_settings")
    .select(
      "payments_enabled, commission_percent, commission_min, deposit_margin_percent, deposit_due_hours, payout_hold_hours, agreement_version",
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
    agreementVersion: data.agreement_version,
  };
});

/**
 * Whether money actually moves. Two switches have to agree: the environment one (a deploy-level
 * kill switch nobody can flip from a browser) and the database one (the admin's own control).
 */
export async function paymentsLive(): Promise<boolean> {
  if (!hasSupabase) return true; // demo mode shows the flow without touching anything
  if (!serverEnv.paymentsEnabled) return false;
  return (await getSettings()).paymentsEnabled;
}

export function moneyRules(s: PlatformSettings): MoneyRules {
  return {
    commissionPercent: s.commissionPercent,
    commissionMinCents: toCents(s.commissionMin),
    depositMarginPercent: s.depositMarginPercent,
  };
}
