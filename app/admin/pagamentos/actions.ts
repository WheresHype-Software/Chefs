"use server";

import { revalidateLocalized } from "@/lib/i18n/server";
import { z } from "zod";
import { maskIban } from "@/lib/crypto";
import { getSession } from "@/lib/dashboard";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { euro } from "@/lib/format";
import { toCents } from "@/lib/money";
import { findPayment, guestLink, syncPayment } from "@/lib/payments/confirm";
import { buildDac7Csv, buildDac7Rows, dac7Gaps, type Dac7Activity, type Dac7Seller } from "@/lib/payments/dac7";
import { eupago } from "@/lib/payments/eupago";
import { batchFiles, buildBatch, payBatch } from "@/lib/payments/payouts";
import { decrypt } from "@/lib/payments/secrets";
import { fail, failWith, ok, type ActionResult } from "@/lib/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Everything the team can do to money.
 *
 * Two rules hold throughout. Nothing happens without a reason written down — `admin_logs` keeps
 * who did what, when, and why, because "we refunded it" with no record is how a disagreement
 * becomes a dispute. And every write goes through the secret-key client: the money tables refuse
 * writes from a browser session even when the session belongs to an admin.
 */

type Admin = { sb: NonNullable<ReturnType<typeof createAdminClient>>; adminId: string };

async function requireAdmin(): Promise<Admin | null> {
  const session = await getSession();
  if (session.demo || session.role !== "admin" || !session.userId) return null;
  // Confirmed against the database, not just the cached session row.
  const user = await createClient();
  const { data } = await user.from("profiles").select("role").eq("id", session.userId).maybeSingle();
  if (data?.role !== "admin") return null;
  const sb = createAdminClient();
  return sb ? { sb, adminId: session.userId } : null;
}

const NO_PERMISSION = "Sem permissão.";

async function log(admin: Admin, action: string, target: string, details: Record<string, unknown>): Promise<void> {
  await admin.sb.from("admin_logs").insert({ admin_id: admin.adminId, action, target, details });
}

const refresh = () => revalidateLocalized("/admin/pagamentos");

const Reason = z.string().trim().min(3, "Escreva o motivo").max(500);
const Uuid = z.string().uuid();

// --- Payments ----------------------------------------------------------------
/** Asks EuPago what the state of a payment really is, and applies the answer. */
export async function checkPayment(paymentId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  if (!Uuid.safeParse(paymentId).success) return fail("Pagamento inválido.");

  const payment = await findPayment({ id: paymentId });
  if (!payment) return fail("Pagamento não encontrado.");
  const outcome = await syncPayment(payment, "admin");
  await log(admin, "payment.check", paymentId, { status: outcome.status, changed: outcome.changed });
  refresh();
  if (outcome.mismatch) return fail("A EuPago indica um valor diferente do nosso. Veja os eventos antes de confirmar à mão.");
  return ok();
}

const ManualPaid = z.object({ paymentId: Uuid, proof: z.string().trim().min(3).max(200), reason: Reason });

/**
 * Marks a payment as received without the provider having said so — a transfer that arrived by
 * another route, say. Rare and conspicuous: it needs a proof reference and a reason.
 */
export async function markPaidManually(input: z.infer<typeof ManualPaid>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = ManualPaid.safeParse(input);
  if (!parsed.success) return fail("Indique o comprovativo e o motivo.");

  await admin.sb.rpc("record_payment_event", {
    p_payment: parsed.data.paymentId,
    p_source: "admin",
    p_type: "manual_paid",
    p_signature_valid: true,
    p_reference: null,
    p_trid: null,
    p_payload: { proof: parsed.data.proof, reason: parsed.data.reason, by: admin.adminId },
  });
  // No amount is passed: a manual confirmation settles exactly what was asked for, nothing else.
  const { error } = await admin.sb.rpc("mark_payment_paid", { p_payment: parsed.data.paymentId, p_trid: "", p_amount: null });
  if (error) return failWith(error, "markPaidManually", "Não foi possível confirmar este pagamento.");
  await log(admin, "payment.manual_paid", parsed.data.paymentId, parsed.data);
  refresh();
  return ok();
}

// --- Refunds -----------------------------------------------------------------
const RefundInput = z.object({ paymentId: Uuid, amount: z.number().positive().max(100000), reason: Reason });

/**
 * Starts a refund. MB WAY and card go back through EuPago immediately; a Multibanco reference
 * cannot be reversed, so it becomes a task that waits for the client's IBAN.
 */
export async function startRefund(input: z.infer<typeof RefundInput>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = RefundInput.safeParse(input);
  if (!parsed.success) return fail("Indique um valor e um motivo.");

  const payment = await findPayment({ id: parsed.data.paymentId });
  if (!payment) return fail("Pagamento não encontrado.");

  const { data: refundId, error } = await admin.sb.rpc("request_refund", {
    p_payment: parsed.data.paymentId,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_by: admin.adminId,
  });
  if (error) {
    if (error.message.includes("amount_out_of_range")) return fail("Esse valor é maior do que o que ainda pode ser devolvido.");
    if (error.message.includes("payment_not_refundable")) return fail("Este pagamento não está num estado que permita devolução.");
    return failWith(error, "startRefund", "Não foi possível registar a devolução.");
  }
  await log(admin, "refund.request", String(refundId), { ...parsed.data, method: payment.method });

  if (payment.method === "multibanco") {
    await askClientForIban(String(refundId), payment.booking_id, parsed.data.amount).catch((err) =>
      console.error("[admin] refund iban email:", err),
    );
    refresh();
    return ok();
  }

  if (!payment.provider_transaction_id) {
    refresh();
    return fail("Falta o identificador da transação na EuPago. Trate esta devolução manualmente.");
  }

  const sent = await eupago.refund({
    transactionId: payment.provider_transaction_id,
    amountCents: toCents(parsed.data.amount),
    reason: parsed.data.reason,
  });
  if (!sent.ok) {
    await admin.sb.rpc("mark_refund_failed", { p_refund: refundId, p_detail: sent.code ?? "provider" });
    refresh();
    return fail("A EuPago recusou a devolução automática. Fica na lista para tratar à mão.");
  }
  const { error: doneError } = await admin.sb.rpc("mark_refund_done", {
    p_refund: refundId,
    p_provider_refund_id: sent.data.refundId ?? "",
    p_bank_reference: "",
  });
  if (doneError) return failWith(doneError, "startRefund done", "A devolução foi enviada mas não ficou registada. Verifique.");
  await log(admin, "refund.done", String(refundId), { provider: sent.data.refundId });
  refresh();
  return ok();
}

/** The client is asked for an IBAN on their own booking page — never by replying to an email. */
async function askClientForIban(refundId: string, bookingId: string, amount: number): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  const { data } = await sb.from("bookings").select("ref, client_id, clients(email)").eq("id", bookingId).maybeSingle();
  const booking = data as unknown as { ref: string; client_id: string; clients: { email: string } | null } | null;
  if (!booking?.clients?.email) return;

  const doc = renderEmail({
    preheader: `Devolução de ${euro(amount)}`,
    heading: "Precisamos do seu IBAN para devolver o sinal",
    lead: `Vamos devolver-lhe ${euro(amount)} da reserva ${booking.ref}.`,
    paragraphs: [
      "Como pagou por referência Multibanco, o banco não permite devolver pelo mesmo caminho: precisamos de uma conta para onde transferir.",
      "Indique o IBAN na página da sua reserva. Nunca lhe pedimos dados bancários por email nem por telefone.",
    ],
    cta: { label: "Indicar o IBAN", href: await guestLink(bookingId, booking.client_id) },
    footnote: `Devolução ${refundId.slice(0, 8)}`,
  });
  await sendEmail({ to: booking.clients.email, subject: `Devolução da reserva ${booking.ref}`, text: doc.text, html: doc.html });
}

/**
 * Shows the client's IBAN once, so the transfer can be made at the bank. Deliberately an action
 * and not a column on a page: every reveal is written down with who asked for it.
 */
export async function revealRefundIban(
  refundId: string,
): Promise<{ ok: true; iban: string; holder: string | null } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: NO_PERMISSION };
  if (!Uuid.safeParse(refundId).success) return { ok: false, error: "Devolução inválida." };

  const { data } = await admin.sb
    .from("refunds")
    .select("client_iban_encrypted, client_iban_holder, client_iban_last4")
    .eq("id", refundId)
    .maybeSingle();
  if (!data?.client_iban_encrypted) return { ok: false, error: "Ainda não temos o IBAN do cliente." };

  let iban: string;
  try {
    iban = decrypt(data.client_iban_encrypted as string);
  } catch (err) {
    console.error("[admin] revealRefundIban:", err);
    return { ok: false, error: "Não foi possível ler o IBAN guardado." };
  }
  await log(admin, "refund.iban_revealed", refundId, { iban: maskIban(iban) });
  return { ok: true, iban, holder: (data.client_iban_holder as string | null) ?? null };
}

const ManualRefundDone = z.object({ refundId: Uuid, bankReference: z.string().trim().min(3).max(120) });

export async function completeManualRefund(input: z.infer<typeof ManualRefundDone>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = ManualRefundDone.safeParse(input);
  if (!parsed.success) return fail("Indique a referência da transferência.");

  const { error } = await admin.sb.rpc("mark_refund_done", {
    p_refund: parsed.data.refundId,
    p_provider_refund_id: "",
    p_bank_reference: parsed.data.bankReference,
  });
  if (error) return failWith(error, "completeManualRefund", "Não foi possível fechar esta devolução.");
  await log(admin, "refund.manual_done", parsed.data.refundId, parsed.data);
  refresh();
  return ok();
}

// --- Payout batches -----------------------------------------------------------
export async function createBatch(): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const batchId = await buildBatch(admin.adminId);
  if (!batchId) return fail("Não há nada pronto a pagar neste momento.");
  await log(admin, "payout.batch_created", batchId, {});
  refresh();
  return ok();
}

export type BatchFile = { ok: true; xml: string; csv: string; reference: string; skipped: string[] } | { ok: false; error: string };

/** Builds the bank file. The only moment plain IBANs exist, and only inside the file. */
export async function downloadBatch(batchId: string): Promise<BatchFile> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: NO_PERMISSION };
  if (!Uuid.safeParse(batchId).success) return { ok: false, error: "Lote inválido." };

  const result = await batchFiles(batchId);
  if ("error" in result) return { ok: false, error: result.error };
  await log(admin, "payout.batch_exported", batchId, { transfers: result.csv.split("\n").length - 2, skipped: result.skipped });
  refresh();
  return { ok: true, ...result };
}

const BatchPaid = z.object({ batchId: Uuid, bankReference: z.string().trim().min(3).max(120) });

export async function confirmBatchPaid(input: z.infer<typeof BatchPaid>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = BatchPaid.safeParse(input);
  if (!parsed.success) return fail("Indique a referência do banco.");

  const result = await payBatch(parsed.data.batchId, parsed.data.bankReference, admin.adminId);
  if ("error" in result) return fail(result.error);
  await log(admin, "payout.batch_paid", parsed.data.batchId, { ...parsed.data, payouts: result.paid });
  refresh();
  return ok();
}

export async function cancelBatch(batchId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = z.object({ batchId: Uuid, reason: Reason }).safeParse({ batchId, reason });
  if (!parsed.success) return fail("Escreva o motivo para anular o lote.");

  const { error } = await admin.sb.rpc("cancel_payout_batch", { p_batch: batchId, p_reason: reason });
  if (error) return failWith(error, "cancelBatch", "Este lote já não pode ser anulado.");
  await log(admin, "payout.batch_cancelled", batchId, { reason });
  refresh();
  return ok();
}

export async function holdPayout(payoutId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = z.object({ payoutId: Uuid, reason: Reason }).safeParse({ payoutId, reason });
  if (!parsed.success) return fail("Escreva o motivo.");
  const { error } = await admin.sb.rpc("hold_payout", { p_payout: payoutId, p_reason: reason });
  if (error) return failWith(error, "holdPayout", "Este pagamento já não está à espera.");
  await log(admin, "payout.held", payoutId, { reason });
  refresh();
  return ok();
}

export async function releasePayout(payoutId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  if (!Uuid.safeParse(payoutId).success) return fail("Pagamento inválido.");
  const { error } = await admin.sb.rpc("release_payout", { p_payout: payoutId });
  if (error) return failWith(error, "releasePayout", "Este pagamento não está retido.");
  await log(admin, "payout.released", payoutId, {});
  refresh();
  return ok();
}

const Adjustment = z.object({ chefId: Uuid, amount: z.number().finite().min(-100000).max(100000), reason: Reason });

/** Money owed to a chef, or taken back, outside any one booking. */
export async function addAdjustment(input: z.infer<typeof Adjustment>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = Adjustment.safeParse(input);
  if (!parsed.success || parsed.data.amount === 0) return fail("Indique um valor diferente de zero e um motivo.");

  const { data, error } = await admin.sb.rpc("add_payout_adjustment", {
    p_chef: parsed.data.chefId,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_by: admin.adminId,
  });
  if (error) return failWith(error, "addAdjustment", "Não foi possível lançar o acerto.");
  await log(admin, "payout.adjustment", String(data), parsed.data);
  refresh();
  return ok();
}

// --- Chefs --------------------------------------------------------------------
/** Confirms a chef's bank account. Until this happens, nothing is transferred to a new IBAN. */
export async function approveChefIban(chefId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  if (!Uuid.safeParse(chefId).success) return fail("Chef inválido.");

  const { data } = await admin.sb.from("chef_billing").select("iban_last4").eq("chef_id", chefId).maybeSingle();
  const { error } = await admin.sb
    .from("chef_billing")
    .update({ iban_approved_at: new Date().toISOString(), iban_approved_by: admin.adminId })
    .eq("chef_id", chefId);
  if (error) return failWith(error, "approveChefIban", "Não foi possível aprovar a conta.");
  await log(admin, "chef.iban_approved", chefId, { last4: data?.iban_last4 });
  refresh();
  return ok();
}

const BlockInput = z.object({ chefId: Uuid, blocked: z.boolean(), reason: z.string().trim().max(500) });

export async function setPayoutsBlocked(input: z.infer<typeof BlockInput>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = BlockInput.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");
  if (parsed.data.blocked && parsed.data.reason.length < 3) return fail("Escreva o motivo do bloqueio.");

  const { error } = await admin.sb
    .from("chefs")
    .update({
      payouts_blocked: parsed.data.blocked,
      payouts_blocked_reason: parsed.data.blocked ? parsed.data.reason : null,
      payouts_blocked_at: parsed.data.blocked ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.chefId);
  if (error) return failWith(error, "setPayoutsBlocked", "Não foi possível alterar o bloqueio.");
  await log(admin, parsed.data.blocked ? "chef.payouts_blocked" : "chef.payouts_unblocked", parsed.data.chefId, parsed.data);
  refresh();
  return ok();
}

// --- Documents ----------------------------------------------------------------
export async function voidDocument(documentId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = z.object({ documentId: Uuid, reason: Reason }).safeParse({ documentId, reason });
  if (!parsed.success) return fail("Escreva o motivo para anular o documento.");

  // A document is never edited: it is voided, and another one is issued in its place.
  const { error } = await admin.sb.from("payout_documents").update({ status: "void", void_reason: reason }).eq("id", documentId);
  if (error) return failWith(error, "voidDocument", "Não foi possível anular o documento.");
  await log(admin, "document.voided", documentId, { reason });
  refresh();
  return ok();
}

// --- Settings -----------------------------------------------------------------
const Settings = z.object({
  payments_enabled: z.boolean(),
  commission_percent: z.number().min(0).max(100),
  commission_min: z.number().min(0).max(1000),
  deposit_margin_percent: z.number().min(0).max(100),
  deposit_due_hours: z.number().int().min(1).max(720),
  payout_hold_hours: z.number().int().min(0).max(2160),
  iban_hold_hours: z.number().int().min(0).max(2160),
  iban_hold_first_time: z.boolean(),
  // Optional: the log already keeps who changed what, when, and from which values to which.
  reason: z.string().trim().max(500).optional(),
});

export async function saveSettings(input: z.infer<typeof Settings>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return fail(NO_PERMISSION);
  const parsed = Settings.safeParse(input);
  if (!parsed.success) return fail("Verifique os valores.");
  const { reason, ...values } = parsed.data;

  const { data: before } = await admin.sb.from("platform_settings").select("*").eq("id", 1).maybeSingle();
  const { error } = await admin.sb
    .from("platform_settings")
    .update({ ...values, updated_by: admin.adminId })
    .eq("id", 1);
  if (error) return failWith(error, "saveSettings", "Não foi possível guardar as definições.");
  await log(admin, "settings.updated", "platform_settings", { before, after: values, reason: reason || null });
  revalidateLocalized("/", "layout");
  return ok();
}

// --- DAC7 ----------------------------------------------------------------------
/**
 * The yearly report of what each chef earned through the platform (DL 20/2022). Produces the
 * spreadsheet the accountant files with the AT by 31 January, and names whoever is still missing
 * data so they can be chased before the deadline.
 *
 * Reading every chef's IBAN at once is exactly the kind of thing that should leave a trace, so it
 * does: one admin_logs line per export, with who and for which year.
 */
export async function exportDac7(year: number): Promise<{ ok: true; csv: string; gaps: string[] } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: NO_PERMISSION };
  if (!Number.isInteger(year) || year < 2024 || year > 2100) return { ok: false, error: "Ano inválido." };

  const [{ data: billing }, { data: payouts }] = await Promise.all([
    admin.sb
      .from("chef_billing")
      .select(
        "chef_id, entity_type, legal_name, nif, country, address_line, postal_code, city, birth_date, birth_place, company_reg_number, iban_encrypted, iban_holder",
      ),
    admin.sb
      .from("payouts")
      .select("chef_id, amount, paid_at, bookings(booking_value, commission_amount)")
      .eq("status", "paid")
      .gte("paid_at", `${year}-01-01`)
      .lt("paid_at", `${year + 1}-01-01`),
  ]);

  const sellers: Dac7Seller[] = ((billing ?? []) as Record<string, string | null>[]).map((b) => {
    let iban: string | null = null;
    if (b.iban_encrypted) {
      try {
        iban = decrypt(b.iban_encrypted);
      } catch {
        iban = null; // reported as a gap rather than guessed at
      }
    }
    return {
      chefId: b.chef_id as string,
      entityType: (b.entity_type as "individual" | "company") ?? "individual",
      legalName: b.legal_name ?? "",
      nif: b.nif ?? "",
      country: b.country ?? "PT",
      address: b.address_line ?? "",
      postalCode: b.postal_code ?? "",
      city: b.city ?? "",
      birthDate: b.birth_date,
      birthPlace: b.birth_place,
      companyRegNumber: b.company_reg_number,
      iban,
      ibanHolder: b.iban_holder,
    };
  });

  const activities: Dac7Activity[] = (
    (payouts ?? []) as unknown as {
      chef_id: string;
      amount: string;
      paid_at: string;
      bookings: { booking_value: string | null; commission_amount: string | null } | null;
    }[]
  ).map((p) => ({
    chefId: p.chef_id,
    paidAt: p.paid_at.slice(0, 10),
    payout: Number(p.amount),
    commission: Number(p.bookings?.commission_amount ?? 0),
    bookingValue: Number(p.bookings?.booking_value ?? 0),
  }));

  const rows = buildDac7Rows(sellers, activities, year);
  const gaps = rows
    .map((r) => ({ name: r.seller.legalName || r.seller.chefId, missing: dac7Gaps(r) }))
    .filter((g) => g.missing.length)
    .map((g) => `${g.name}: falta ${g.missing.join(", ")}`);

  await log(admin, "dac7.exported", String(year), { sellers: rows.length, incomplete: gaps.length });
  return { ok: true, csv: buildDac7Csv(rows), gaps };
}
