"use server";

import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { isValidIban, isValidNif, isValidPostalCode, normaliseIban } from "@/lib/fiscal";
import type { Locale } from "@/lib/i18n/routing";
import { requestTranslator } from "@/lib/i18n/server";
import { getTranslator } from "@/lib/i18n/translator";
import { canEncrypt, encrypt, hashToken, oneTimeToken } from "@/lib/payments/secrets";
import { fail, failInvalid, failWith, ok, type ActionResult } from "@/lib/result";
import { chefContext, done } from "./context";
import { acceptLegal } from "./legal";

const CONFIRM_PATH = "/dashboard/faturacao/confirmar";

const BillingInput = z.object({
  entity_type: z.enum(["individual", "company"]),
  legal_name: z.string().trim().min(3).max(160),
  nif: z.string().trim().min(9).max(14),
  vat_regime: z.enum(["normal", "isento_art53"]),
  address_line: z.string().trim().min(5).max(200),
  postal_code: z.string().trim().min(8).max(8),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().length(2).default("PT"),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  birth_place: z.string().trim().max(120).optional(),
  company_reg_number: z.string().trim().max(40).optional(),
});

/** The chef's fiscal identity. Nothing here moves money; it is what the documents will say. */
export async function saveBilling(input: z.infer<typeof BillingInput>): Promise<ActionResult> {
  const t = await requestTranslator("errors");
  const parsed = BillingInput.safeParse(input);
  if (!parsed.success) {
    const fields = ["legal_name", "nif", "address_line", "postal_code", "city", "birth_date", "birth_place", "company_reg_number"] as const;
    const labels = Object.fromEntries(fields.map((f) => [f, t(`dashboard.billing.fields.${f}`)]));
    return failInvalid(parsed.error, t, labels);
  }
  const b = parsed.data;

  // The check digits are the point: a NIF that is one keystroke off makes every document wrong.
  if (!isValidNif(b.nif)) return fail(t("dashboard.billing.invalidNif"));
  if (!isValidPostalCode(b.postal_code)) return fail(t("dashboard.billing.postalCode"));
  if (b.entity_type === "individual" && (!b.birth_date || !b.birth_place)) {
    return fail(t("dashboard.billing.birthRequired"));
  }
  if (b.entity_type === "company" && !b.company_reg_number) {
    return fail(t("dashboard.billing.companyRegRequired"));
  }

  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));

  const { error } = await ctx.sb.rpc("save_chef_billing", {
    p_entity_type: b.entity_type,
    p_legal_name: b.legal_name,
    p_nif: b.nif.replace(/\D/g, ""),
    p_vat_regime: b.vat_regime,
    p_address_line: b.address_line,
    p_postal_code: b.postal_code,
    p_city: b.city,
    p_country: b.country.toUpperCase(),
    p_birth_date: b.birth_date || null,
    p_birth_place: b.birth_place || null,
    p_company_reg_number: b.company_reg_number || null,
  });
  if (error) return failWith(error, "saveBilling", t("generic"));
  return done("/dashboard/faturacao");
}

const IbanInput = z.object({
  iban: z.string().trim().min(15).max(42),
  holder: z.string().trim().min(3).max(160),
  bic: z.string().trim().max(11).optional(),
});

/**
 * Changing where the money goes is the one move an attacker inside a chef's account would make.
 * So the new IBAN only gets parked here: it becomes real when the chef opens a one-time link sent
 * to their account address, and the address being replaced is told at the same time.
 */
export async function requestIbanChange(input: z.infer<typeof IbanInput>): Promise<ActionResult> {
  const locale = (await getLocale()) as Locale;
  const t = getTranslator(locale, "errors");
  const parsed = IbanInput.safeParse(input);
  if (!parsed.success) {
    const labels = { iban: t("dashboard.billing.ibanFields.iban"), holder: t("dashboard.billing.ibanFields.holder") };
    return failInvalid(parsed.error, t, labels);
  }
  const iban = normaliseIban(parsed.data.iban);
  if (!isValidIban(iban)) return fail(t("invalidIban"));

  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  if (!canEncrypt()) return fail(t("dashboard.billing.cannotStoreBank"));

  const { token, hash } = oneTimeToken();
  const { error } = await ctx.sb.rpc("start_iban_change", {
    p_encrypted: encrypt(iban),
    p_last4: iban.slice(-4),
    p_holder: parsed.data.holder,
    p_bic: parsed.data.bic ?? null,
    p_token_hash: hash,
    p_minutes: 60,
  });
  if (error) return failWith(error, "requestIbanChange", t("generic"));

  const {
    data: { user },
  } = await ctx.sb.auth.getUser();
  const to = user?.email;
  if (to) {
    // The chef asking is the one who receives it: the language they are using now.
    const e = getTranslator(locale, "emails");
    const doc = renderEmail(
      {
        preheader: e("ibanChange.preheader"),
        heading: e("ibanChange.heading"),
        lead: e("ibanChange.lead", { last4: iban.slice(-4) }),
        paragraphs: [e("ibanChange.confirm"), e("ibanChange.validity"), e("ibanChange.notYou")],
        cta: { label: e("ibanChange.cta"), href: `${CONFIRM_PATH}?t=${token}` },
        footnote: e("ibanChange.footnote"),
      },
      locale,
    );
    await sendEmail({ to, subject: e("ibanChange.subject"), text: doc.text, html: doc.html }).catch((err) =>
      console.error("[action] requestIbanChange email:", err),
    );
  }
  return done("/dashboard/faturacao");
}

/** Step two: the link was opened. Only then does the parked IBAN become the real one. */
export async function confirmIbanChange(token: string): Promise<ActionResult> {
  const t = await requestTranslator("errors");
  if (typeof token !== "string" || token.length < 20) return fail(t("dashboard.billing.invalidLink"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));

  const { error } = await ctx.sb.rpc("confirm_iban_change", { p_token_hash: hashToken(token) });
  if (error) {
    if (error.message.includes("link_expired")) return fail(t("dashboard.billing.linkExpired"));
    if (error.message.includes("invalid_token")) return fail(t("dashboard.billing.invalidLink"));
    if (error.message.includes("no_pending_change")) return fail(t("dashboard.billing.noPendingChange"));
    return failWith(error, "confirmIbanChange", t("generic"));
  }
  return done("/dashboard/faturacao");
}

/**
 * The contract. Accepting it is what makes every payment document valid without signing each one.
 * Recorded like every other acceptance (lib/acceptance.ts): text archived, copy sent by email.
 */
export async function acceptAgreement(): Promise<ActionResult> {
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  return acceptLegal(["chef_contract"], "billing");
}

/**
 * The chef confirms a payment document. The contract already covers it, so this never blocks
 * anything — it just records who pressed it, from where and when.
 */
export async function acknowledgeDocument(documentId: string): Promise<ActionResult> {
  const t = await requestTranslator("errors");
  if (!z.string().uuid().safeParse(documentId).success) return fail(t("invalidDocument"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));

  const h = await headers();
  const { error } = await ctx.sb.rpc("acknowledge_payout_document", {
    p_document: documentId,
    p_ip: (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null,
    p_user_agent: h.get("user-agent"),
  });
  if (error) return failWith(error, "acknowledgeDocument", t("generic"));
  return done("/dashboard/pagamentos");
}
