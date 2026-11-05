import "server-only";
import { getSettings, type PlatformSettings } from "../settings";
import { chefScope } from "./session";
import type { ChefBilling, PayoutReadiness } from "./types";

// Columns a chef's own session is allowed to read: never the encrypted IBAN, never the pending
// token. The database revokes those columns too; this list is the first of the two locks.
const BILLING_COLUMNS =
  "entity_type, legal_name, nif, vat_regime, address_line, postal_code, city, country, birth_date, birth_place, company_reg_number, iban_last4, iban_holder, iban_bic, iban_changed_at, iban_approved_at, iban_pending_last4, iban_pending_expires_at, payout_hold_until, commission_percent_override, verified_at";

export type BillingView = {
  billing: ChefBilling | null;
  readiness: PayoutReadiness;
  settings: PlatformSettings;
  /** The agreement version this chef has accepted, if any. */
  acceptedVersion: number | null;
};

const EMPTY_READINESS = (requiredAgreementVersion: number): PayoutReadiness => ({
  hasFiscal: false,
  hasDac7: false,
  hasIban: false,
  ibanApproved: false,
  ibanPending: false,
  onHold: false,
  holdUntil: null,
  agreementVersion: null,
  requiredAgreementVersion,
  blocked: false,
  blockedReason: null,
});

export async function getBilling(): Promise<BillingView> {
  const scope = await chefScope();
  const settings = await getSettings();
  if (scope.demo) {
    // Demo mode shows a chef halfway through: fiscal data in, bank details still missing.
    return {
      settings,
      acceptedVersion: null,
      billing: {
        entity_type: "individual",
        legal_name: "Carla Maria Nunes",
        nif: "123456789",
        vat_regime: "isento_art53",
        address_line: "Rua dos Remédios 44, 2.º Esq.",
        postal_code: "1100-443",
        city: "Lisboa",
        country: "PT",
        birth_date: "1986-04-12",
        birth_place: "Lisboa",
        company_reg_number: null,
        iban_last4: null,
        iban_holder: null,
        iban_bic: null,
        iban_changed_at: null,
        iban_approved_at: null,
        iban_pending_last4: null,
        iban_pending_expires_at: null,
        payout_hold_until: null,
        commission_percent_override: null,
        verified_at: null,
      },
      readiness: { ...EMPTY_READINESS(settings.agreementVersion), hasFiscal: true, hasDac7: true },
    };
  }

  const { sb, chef } = scope;
  const [row, readiness] = await Promise.all([
    sb.from("chef_billing").select(BILLING_COLUMNS).eq("chef_id", chef.id).maybeSingle(),
    sb.rpc("chef_payout_readiness", { p_chef: chef.id }),
  ]);
  const r = (readiness.data as PayoutReadiness | null) ?? EMPTY_READINESS(settings.agreementVersion);
  return {
    billing: (row.data as unknown as ChefBilling) ?? null,
    readiness: r,
    settings,
    acceptedVersion: r.agreementVersion,
  };
}
