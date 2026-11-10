"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sendEmail, siteUrl } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { isValidIban, isValidNif, isValidPostalCode, normaliseIban } from "@/lib/fiscal";
import { canEncrypt, encrypt, hashToken, oneTimeToken } from "@/lib/payments/secrets";
import { fail, failInvalid, failWith, ok, type ActionResult } from "@/lib/result";
import { chefContext, done, NO_CHEF } from "./context";
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

const BILLING_LABELS: Record<string, string> = {
  legal_name: "Nome legal completo",
  nif: "NIF",
  address_line: "Morada fiscal",
  postal_code: "Indique o código postal no formato 0000-000.",
  city: "Localidade",
  birth_date: "Data de nascimento",
  birth_place: "Local de nascimento",
  company_reg_number: "Número de registo comercial",
};

/** The chef's fiscal identity. Nothing here moves money; it is what the documents will say. */
export async function saveBilling(input: z.infer<typeof BillingInput>): Promise<ActionResult> {
  const parsed = BillingInput.safeParse(input);
  if (!parsed.success) return failInvalid(parsed.error, BILLING_LABELS);
  const b = parsed.data;

  // The check digits are the point: a NIF that is one keystroke off makes every document wrong.
  if (!isValidNif(b.nif)) return fail("Esse NIF não é válido. Confirme os nove dígitos.");
  if (!isValidPostalCode(b.postal_code)) return fail("Indique o código postal no formato 0000-000.");
  if (b.entity_type === "individual" && (!b.birth_date || !b.birth_place)) {
    return fail("A data e o local de nascimento são obrigatórios: a lei obriga-nos a comunicá-los à Autoridade Tributária.");
  }
  if (b.entity_type === "company" && !b.company_reg_number) {
    return fail("Indique o número de registo comercial da empresa.");
  }

  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);

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
  if (error) return failWith(error, "saveBilling");
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
  const parsed = IbanInput.safeParse(input);
  if (!parsed.success) return failInvalid(parsed.error, { iban: "IBAN", holder: "Titular da conta" });
  const iban = normaliseIban(parsed.data.iban);
  if (!isValidIban(iban)) return fail("Esse IBAN não é válido. Confirme os dígitos com o seu banco.");

  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  if (!canEncrypt()) return fail("A plataforma ainda não está preparada para guardar dados bancários. Falamos consigo.");

  const { token, hash } = oneTimeToken();
  const { error } = await ctx.sb.rpc("start_iban_change", {
    p_encrypted: encrypt(iban),
    p_last4: iban.slice(-4),
    p_holder: parsed.data.holder,
    p_bic: parsed.data.bic ?? null,
    p_token_hash: hash,
    p_minutes: 60,
  });
  if (error) return failWith(error, "requestIbanChange");

  const {
    data: { user },
  } = await ctx.sb.auth.getUser();
  const to = user?.email;
  if (to) {
    const link = siteUrl(`${CONFIRM_PATH}?t=${token}`);
    const doc = renderEmail({
      preheader: "Confirma a alteração do IBAN",
      heading: "Confirma o teu novo IBAN",
      lead: `Pediste para passar a receber os pagamentos numa conta terminada em ${iban.slice(-4)}.`,
      paragraphs: [
        "Abre a ligação abaixo para confirmar. Enquanto não confirmares, os pagamentos continuam a ir para a conta anterior.",
        "A ligação é válida durante uma hora e só funciona com a tua sessão iniciada.",
        "Se não foste tu, não abras a ligação e fala connosco imediatamente: a tua conta pode estar comprometida.",
      ],
      cta: { label: "Confirmar o IBAN", href: link },
      footnote: "Depois de confirmado, os pagamentos ficam retidos 72 horas por segurança.",
    });
    await sendEmail({ to, subject: "Confirma a alteração do teu IBAN", text: doc.text, html: doc.html }).catch((err) =>
      console.error("[action] requestIbanChange email:", err),
    );
  }
  return done("/dashboard/faturacao");
}

/** Step two: the link was opened. Only then does the parked IBAN become the real one. */
export async function confirmIbanChange(token: string): Promise<ActionResult> {
  if (typeof token !== "string" || token.length < 20) return fail("Ligação inválida. Peça a alteração de novo.");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);

  const { error } = await ctx.sb.rpc("confirm_iban_change", { p_token_hash: hashToken(token) });
  if (error) {
    if (error.message.includes("link_expired")) return fail("A ligação expirou. Peça a alteração de novo.");
    if (error.message.includes("invalid_token")) return fail("Ligação inválida. Peça a alteração de novo.");
    if (error.message.includes("no_pending_change")) return fail("Não há nenhuma alteração à espera de confirmação.");
    return failWith(error, "confirmIbanChange");
  }
  return done("/dashboard/faturacao");
}

/**
 * The contract. Accepting it is what makes every payment document valid without signing each one.
 * Recorded like every other acceptance (lib/acceptance.ts): text archived, copy sent by email.
 */
export async function acceptAgreement(): Promise<ActionResult> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  return acceptLegal(["chef_contract"], "billing");
}

/**
 * The chef confirms a payment document. The contract already covers it, so this never blocks
 * anything — it just records who pressed it, from where and when.
 */
export async function acknowledgeDocument(documentId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(documentId).success) return fail("Documento inválido.");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);

  const h = await headers();
  const { error } = await ctx.sb.rpc("acknowledge_payout_document", {
    p_document: documentId,
    p_ip: (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null,
    p_user_agent: h.get("user-agent"),
  });
  if (error) return failWith(error, "acknowledgeDocument");
  return done("/dashboard/pagamentos");
}
