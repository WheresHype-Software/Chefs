import "server-only";
import { sha256 } from "../crypto";
import { sendEmail } from "../email";
import { renderEmail } from "../email-template";
import { euro } from "../format";
import { profileLocaleFrom } from "../i18n/recipient";
import { getTranslator } from "../i18n/translator";
import { COMPANY, EMAIL } from "../legal";
import { toCents } from "../money";
import { serverEnv } from "../env.server";
import { createAdminClient } from "../supabase/admin";
import { renderPayoutDocument, type DocumentSnapshot } from "./document-html";
import { decrypt } from "./secrets";
import { buildSepaCsv, buildSepaXml, type SepaBatch, type SepaTransfer } from "./sepa";

/**
 * Paying the chefs.
 *
 * Three steps, each deliberately separate so a person stands between them: collect what is owed
 * into a batch, produce the bank file, and — once the transfers have actually left — record it
 * and issue each chef their document.
 *
 * Plain IBANs exist in one place only: inside `batchFiles`, for as long as it takes to build the
 * file. They are decrypted with the application key, never stored decrypted, never logged, and
 * never returned to a browser other than inside the file an admin downloads.
 */

const BUCKET = "payout-docs";

export type BatchRow = {
  id: string;
  reference: string;
  status: "draft" | "exported" | "paid" | "cancelled";
  total: string | number;
  chef_count: number;
  created_at: string;
  exported_at: string | null;
  paid_at: string | null;
  bank_reference: string | null;
};

/** Collects everything due and ready into a new batch. Null when there is nothing to pay. */
export async function buildBatch(adminId: string | null): Promise<string | null> {
  const sb = createAdminClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("build_payout_batch", { p_created_by: adminId });
  if (error) {
    console.error("[payouts] build_payout_batch:", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

type PayoutWithChef = {
  id: string;
  chef_id: string;
  amount: string | number;
  booking_id: string | null;
  bookings: { ref: string } | null;
  chefs: { display_name: string } | null;
};

/**
 * The SEPA file and its CSV twin. Reads the encrypted IBANs, decrypts them in memory, and marks
 * the batch exported. A chef whose IBAN cannot be read is left out and reported, rather than
 * silently dropped — a missing transfer is worse than a smaller file.
 */
export async function batchFiles(
  batchId: string,
): Promise<{ xml: string; csv: string; reference: string; skipped: string[] } | { error: string }> {
  const sb = createAdminClient();
  if (!sb) return { error: "Os pagamentos não estão configurados." };
  if (!serverEnv.platformAccount.iban) return { error: "Falta o IBAN da conta do Ao Lume (PLATFORM_IBAN)." };

  const [{ data: batch }, { data: payouts }] = await Promise.all([
    sb.from("payout_batches").select("id, reference, status, created_at").eq("id", batchId).maybeSingle(),
    sb.from("payouts").select("id, chef_id, amount, booking_id, bookings(ref), chefs(display_name)").eq("batch_id", batchId),
  ]);
  if (!batch) return { error: "Lote não encontrado." };
  const rows = (payouts as unknown as PayoutWithChef[] | null) ?? [];
  if (!rows.length) return { error: "Este lote não tem pagamentos." };

  // One row per chef in the file: a chef with three bookings gets one transfer, not three.
  const chefIds = [...new Set(rows.map((r) => r.chef_id))];
  const { data: billing } = await sb
    .from("chef_billing")
    .select("chef_id, legal_name, iban_encrypted, iban_last4, iban_holder, iban_bic")
    .in("chef_id", chefIds);

  const byChef = new Map((billing ?? []).map((b) => [b.chef_id as string, b]));
  const transfers: SepaTransfer[] = [];
  const skipped: string[] = [];

  for (const chefId of chefIds) {
    const b = byChef.get(chefId);
    const amountCents = rows.filter((r) => r.chef_id === chefId).reduce((sum, r) => sum + toCents(r.amount), 0);
    const name = b?.iban_holder || b?.legal_name || rows.find((r) => r.chef_id === chefId)?.chefs?.display_name || "";
    if (!b?.iban_encrypted || amountCents <= 0) {
      skipped.push(name || chefId);
      continue;
    }
    let iban: string;
    try {
      iban = decrypt(b.iban_encrypted as string);
    } catch (err) {
      console.error("[payouts] could not read an IBAN:", chefId, err instanceof Error ? err.message : err);
      skipped.push(name || chefId);
      continue;
    }
    transfers.push({
      reference: `${batch.reference}-${(transfers.length + 1).toString().padStart(3, "0")}`,
      name,
      iban,
      bic: (b.iban_bic as string | null) ?? null,
      amountCents,
    });
  }

  if (!transfers.length) return { error: "Nenhum chef deste lote tem dados bancários legíveis." };

  const executionDate = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const sepa: SepaBatch = {
    messageId: batch.reference as string,
    createdAt: new Date().toISOString(),
    executionDate,
    debtor: {
      name: serverEnv.platformAccount.name,
      iban: serverEnv.platformAccount.iban,
      bic: serverEnv.platformAccount.bic ?? null,
      nif: COMPANY.nif,
    },
    transfers,
  };

  const xml = buildSepaXml(sepa);
  const csv = buildSepaCsv(sepa);
  const base = `lotes/${batch.reference}`;
  await Promise.all([
    sb.storage.from(BUCKET).upload(`${base}.xml`, xml, { contentType: "application/xml", upsert: true }),
    sb.storage.from(BUCKET).upload(`${base}.csv`, csv, { contentType: "text/csv", upsert: true }),
  ]);
  if (batch.status === "draft") {
    await sb.rpc("mark_batch_exported", { p_batch: batchId, p_sepa_path: `${base}.xml`, p_csv_path: `${base}.csv` });
  }

  return { xml, csv, reference: batch.reference as string, skipped };
}

/**
 * The transfers have left the bank. Records it, drops each chef's balance, and issues the
 * documents — which is the first moment the document can honestly state a transfer date.
 */
export async function payBatch(
  batchId: string,
  bankReference: string,
  adminId: string | null,
): Promise<{ paid: number } | { error: string }> {
  const sb = createAdminClient();
  if (!sb) return { error: "Os pagamentos não estão configurados." };
  const { data, error } = await sb.rpc("mark_batch_paid", { p_batch: batchId, p_bank_reference: bankReference, p_by: adminId });
  if (error) {
    if (error.message.includes("batch_not_payable")) return { error: "Este lote já foi pago ou cancelado." };
    console.error("[payouts] mark_batch_paid:", error.message);
    return { error: "Não foi possível marcar o lote como pago." };
  }
  await issueDocuments(batchId).catch((err) => console.error("[payouts] issueDocuments:", err));
  return { paid: (data as number) ?? 0 };
}

type PayoutForDocument = {
  id: string;
  chef_id: string;
  booking_id: string | null;
  amount: string | number;
  paid_at: string | null;
  bookings: {
    ref: string;
    date: string;
    offer_title: string;
    guests: number;
    booking_value: string | number | null;
    deposit_amount: string | number | null;
    commission_amount: string | number | null;
    commission_percent_snapshot: string | number | null;
  } | null;
};

/** One document per payout, built from the data as it stands at the moment of payment. */
export async function issueDocuments(batchId: string): Promise<number> {
  const sb = createAdminClient();
  if (!sb) return 0;

  const [{ data: batch }, { data: payouts }, { data: settings }] = await Promise.all([
    sb.from("payout_batches").select("reference, bank_reference, paid_at").eq("id", batchId).maybeSingle(),
    sb
      .from("payouts")
      .select(
        "id, chef_id, booking_id, amount, paid_at, bookings(ref, date, offer_title, guests, booking_value, deposit_amount, commission_amount, commission_percent_snapshot)",
      )
      .eq("batch_id", batchId),
    sb.from("platform_settings").select("agreement_version, commission_percent").eq("id", 1).maybeSingle(),
  ]);
  const rows = (payouts as unknown as PayoutForDocument[] | null) ?? [];
  if (!batch || !rows.length) return 0;

  const chefIds = [...new Set(rows.map((r) => r.chef_id))];
  const { data: billing } = await sb
    .from("chef_billing")
    .select("chef_id, legal_name, nif, entity_type, vat_regime, address_line, postal_code, city, country, iban_last4")
    .in("chef_id", chefIds);
  const byChef = new Map((billing ?? []).map((b) => [b.chef_id as string, b]));

  let issued = 0;
  for (const payout of rows) {
    const b = byChef.get(payout.chef_id);
    const booking = payout.bookings;
    // Without fiscal data the document would be worthless; the payout is flagged instead.
    if (!b?.legal_name || !b.nif || !booking) {
      console.error("[payouts] no fiscal data for a paid payout:", payout.id);
      continue;
    }

    const { data: number } = await sb.rpc("next_payout_document_number");
    const snapshot: DocumentSnapshot = {
      number: (number as string) ?? `AL-PAG-${payout.id.slice(0, 8)}`,
      issuedAt: new Date().toISOString(),
      platform: { name: COMPANY.name, nif: COMPANY.nif, address: COMPANY.address, email: EMAIL.bookings },
      chef: {
        legalName: b.legal_name as string,
        nif: b.nif as string,
        entityType: (b.entity_type as "individual" | "company") ?? "individual",
        vatRegime: (b.vat_regime as "normal" | "isento_art53") ?? "isento_art53",
        address: (b.address_line as string) ?? "",
        postalCode: (b.postal_code as string) ?? "",
        city: (b.city as string) ?? "",
        country: (b.country as string) ?? "PT",
      },
      booking: { ref: booking.ref, date: booking.date, service: booking.offer_title, guests: booking.guests },
      amounts: {
        bookingValue: Number(booking.booking_value ?? 0),
        deposit: Number(booking.deposit_amount ?? 0),
        commissionPercent: Number(booking.commission_percent_snapshot ?? settings?.commission_percent ?? 0),
        commission: Number(booking.commission_amount ?? 0),
        payout: Number(payout.amount),
      },
      transfer: {
        ibanLast4: (b.iban_last4 as string) ?? "????",
        bankReference: (batch.bank_reference as string | null) ?? null,
        paidAt: payout.paid_at ?? (batch.paid_at as string | null),
        batchReference: batch.reference as string,
      },
      agreementVersion: (settings?.agreement_version as number) ?? 1,
    };

    const html = renderPayoutDocument(snapshot);
    const path = `${payout.chef_id}/${snapshot.number}.html`;
    await sb.storage.from(BUCKET).upload(path, html, { contentType: "text/html; charset=utf-8", upsert: false });

    const { error } = await sb.from("payout_documents").insert({
      payout_id: payout.id,
      booking_id: payout.booking_id,
      chef_id: payout.chef_id,
      number: snapshot.number,
      snapshot,
      body_sha256: sha256(html),
      document_path: path,
      agreement_version: snapshot.agreementVersion,
    });
    if (error) {
      console.error("[payouts] document insert:", error.message);
      continue;
    }
    issued += 1;
    await notifyChefPaid(payout.chef_id, snapshot).catch((err) => console.error("[payouts] chef email:", err));
  }
  return issued;
}

async function notifyChefPaid(chefId: string, snapshot: DocumentSnapshot): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  const { data } = await sb.from("chefs").select("profiles(email, locale)").eq("id", chefId).maybeSingle();
  const profile = (data as unknown as { profiles: { email: string | null; locale: string | null } | null } | null)?.profiles;
  const email = profile?.email;
  if (!email) return;

  // The chef's language.
  const locale = profileLocaleFrom(profile);
  const e = getTranslator(locale, "emails");
  const payout = euro(snapshot.amounts.payout, locale);
  const doc = renderEmail(
    {
      preheader: e("payout.preheader", { amount: payout }),
      heading: e("payout.heading"),
      lead: e("payout.lead", { ref: snapshot.booking.ref }),
      facts: [
        [e("payout.depositReceived"), euro(snapshot.amounts.deposit, locale)],
        [e("payout.commission"), `− ${euro(snapshot.amounts.commission, locale)}`],
        [e("payout.transferred"), payout],
        [e("payout.account"), `•••• ${snapshot.transfer.ibanLast4}`],
      ],
      paragraphs: [e("payout.body")],
      cta: { label: e("payout.cta"), href: "/dashboard/pagamentos" },
      footnote: e("payout.footnote", { number: snapshot.number }),
    },
    locale,
  );
  await sendEmail({
    to: email,
    subject: e("payout.subject", { amount: payout, ref: snapshot.booking.ref }),
    text: doc.text,
    html: doc.html,
  });
}
