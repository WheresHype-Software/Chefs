import { normaliseIban } from "../fiscal";
import { toEuros } from "../money";

/**
 * The bank file for a payout batch.
 *
 * EuPago cannot send money to a chef's IBAN, so the transfers are made at the bank. This builds a
 * SEPA credit transfer instruction (ISO 20022 pain.001.001.09, what Portuguese banks import) and
 * a plain CSV next to it, for checking by eye before anything is uploaded.
 *
 * Pure on purpose: given the same batch it produces the same bytes, which is what makes it
 * testable and what makes a file diffable against what was actually sent.
 */

export type SepaTransfer = {
  /** The payment document number; it travels with the money as the end-to-end id. */
  reference: string;
  /** The account holder, as the bank has it. */
  name: string;
  iban: string;
  bic?: string | null;
  amountCents: number;
};

export type SepaBatch = {
  /** Our batch reference, e.g. LOTE-202611-001. */
  messageId: string;
  /** ISO timestamp for the file header. */
  createdAt: string;
  /** The day the bank should execute it (YYYY-MM-DD). */
  executionDate: string;
  debtor: { name: string; iban: string; bic?: string | null; nif?: string | null };
  transfers: SepaTransfer[];
};

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/**
 * Banks reject names with characters outside the Latin subset SEPA allows, and truncate silently
 * past 70. Better to fold accents here than to have a transfer bounce three days later.
 */
export function sepaName(value: string, max = 70): string {
  const folded = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 /?:().,'+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return folded.slice(0, max);
}

/** Amounts are written with two decimals and a dot, whatever the locale. */
export function sepaAmount(cents: number): string {
  return toEuros(cents).toFixed(2);
}

export function buildSepaXml(batch: SepaBatch): string {
  const total = batch.transfers.reduce((sum, t) => sum + t.amountCents, 0);
  const count = batch.transfers.length;
  // The timestamp goes in without a zone, as the schema's ISODateTime expects.
  const created = batch.createdAt.replace(/\.\d+Z?$/, "").replace(/Z$/, "");

  const transfers = batch.transfers
    .map((t) => {
      const agent = t.bic ? `\n        <CdtrAgt><FinInstnId><BICFI>${esc(t.bic.toUpperCase())}</BICFI></FinInstnId></CdtrAgt>` : "";
      return `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${esc(t.reference.slice(0, 35))}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${sepaAmount(t.amountCents)}</InstdAmt></Amt>${agent}
        <Cdtr><Nm>${esc(sepaName(t.name))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${esc(normaliseIban(t.iban))}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${esc(sepaName(`Ao Lume ${t.reference}`, 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>`;
    })
    .join("\n");

  const debtorAgent = batch.debtor.bic
    ? `\n      <DbtrAgt><FinInstnId><BICFI>${esc(batch.debtor.bic.toUpperCase())}</BICFI></FinInstnId></DbtrAgt>`
    : "";
  const initiatingId = batch.debtor.nif ? `\n        <Id><OrgId><Othr><Id>${esc(batch.debtor.nif)}</Id></Othr></OrgId></Id>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${esc(batch.messageId.slice(0, 35))}</MsgId>
      <CreDtTm>${esc(created)}</CreDtTm>
      <NbOfTxs>${count}</NbOfTxs>
      <CtrlSum>${sepaAmount(total)}</CtrlSum>
      <InitgPty>
        <Nm>${esc(sepaName(batch.debtor.name))}</Nm>${initiatingId}
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${esc(batch.messageId.slice(0, 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${count}</NbOfTxs>
      <CtrlSum>${sepaAmount(total)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>${esc(batch.executionDate)}</Dt></ReqdExctnDt>
      <Dbtr><Nm>${esc(sepaName(batch.debtor.name))}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${esc(normaliseIban(batch.debtor.iban))}</IBAN></Id></DbtrAcct>${debtorAgent}
      <ChrgBr>SLEV</ChrgBr>
${transfers}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;
}

/** The same batch as a spreadsheet, for a human to read before uploading anything. */
export function buildSepaCsv(batch: SepaBatch): string {
  const cell = (value: string) => (/[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const rows = batch.transfers.map((t) =>
    [t.reference, sepaName(t.name), normaliseIban(t.iban), t.bic ?? "", sepaAmount(t.amountCents), "EUR", batch.executionDate]
      .map((v) => cell(String(v)))
      .join(";"),
  );
  const total = batch.transfers.reduce((sum, t) => sum + t.amountCents, 0);
  return [
    "referencia;beneficiario;iban;bic;valor;moeda;data",
    ...rows,
    `TOTAL;${batch.transfers.length} transferencias;;;${sepaAmount(total)};EUR;${batch.executionDate}`,
  ].join("\n");
}
