import { euro } from "../format";

/**
 * The document that goes with every payment to a chef.
 *
 * It says, in one page: who we are, who the chef is (legal name, NIF, fiscal address), which
 * booking it is about, what the client paid as a signal, what we kept as commission, and what was
 * transferred. It is issued under the contract the chef accepted when they signed up, which is
 * why it needs no signature of its own — and it says which version of that contract it stands on.
 *
 * It is **not an invoice** and says so plainly: the chef still invoices their client for the
 * service, and we invoice the chef for the commission. Pure and deterministic, because its hash
 * is what makes it tamper-evident.
 */

export type DocumentSnapshot = {
  number: string;
  issuedAt: string;
  platform: { name: string; nif: string; address: string; email: string };
  chef: {
    legalName: string;
    nif: string;
    entityType: "individual" | "company";
    vatRegime: "normal" | "isento_art53";
    address: string;
    postalCode: string;
    city: string;
    country: string;
  };
  booking: { ref: string; date: string; service: string; guests: number };
  amounts: { bookingValue: number; deposit: number; commissionPercent: number; commission: number; payout: number };
  transfer: { ibanLast4: string; bankReference: string | null; paidAt: string | null; batchReference: string };
  agreementVersion: number;
};

function esc(value: string | number): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const day = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString("pt-PT", { dateStyle: "long" }) : "—");

/** The body that gets hashed and stored. Self-contained: no external styles, no images, no fonts. */
export function renderPayoutDocument(s: DocumentSnapshot): string {
  const rows: [string, string][] = [
    ["Valor da reserva", euro(s.amounts.bookingValue)],
    ["Sinal recebido do cliente", euro(s.amounts.deposit)],
    [`Comissão Ao Lume (${String(s.amounts.commissionPercent).replace(".", ",")}% do valor da reserva)`, `− ${euro(s.amounts.commission)}`],
  ];

  return `<!doctype html>
<html lang="pt-PT">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.number)} · Documento de pagamento</title>
<style>
  :root { color-scheme: light }
  body { margin: 0; padding: 32px; background: #f3f6fb; color: #142033;
         font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif }
  .sheet { max-width: 760px; margin: 0 auto; background: #fff; padding: 40px; border: 1px solid #dde4ef }
  h1 { font-size: 22px; margin: 0 0 4px }
  .muted { color: #535e76 }
  .lab { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #535e76; margin: 0 0 2px }
  .parties { display: flex; flex-wrap: wrap; gap: 32px; margin: 28px 0; }
  .parties > div { flex: 1 1 240px }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 0 }
  td { padding: 10px 0; border-bottom: 1px solid #dde4ef; vertical-align: baseline }
  td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap }
  tr.total td { border-bottom: 0; border-top: 2px solid #142033; font-size: 19px; font-weight: 700; padding-top: 14px }
  .note { margin-top: 28px; padding-top: 16px; border-top: 1px solid #dde4ef; font-size: 13px; color: #535e76 }
  @media print { body { background: #fff; padding: 0 } .sheet { border: 0; padding: 0 } }
</style>
<div class="sheet">
  <p class="lab">Documento de pagamento</p>
  <h1>${esc(s.number)}</h1>
  <p class="muted" style="margin:0">Emitido a ${esc(day(s.issuedAt))} · lote ${esc(s.transfer.batchReference)}</p>

  <div class="parties">
    <div>
      <p class="lab">Pago por</p>
      <strong>${esc(s.platform.name)}</strong><br>
      NIF ${esc(s.platform.nif)}<br>
      ${esc(s.platform.address)}<br>
      ${esc(s.platform.email)}
    </div>
    <div>
      <p class="lab">Pago a</p>
      <strong>${esc(s.chef.legalName)}</strong><br>
      NIF ${esc(s.chef.nif)}<br>
      ${esc(s.chef.address)}<br>
      ${esc(s.chef.postalCode)} ${esc(s.chef.city)} · ${esc(s.chef.country)}<br>
      <span class="muted">${s.chef.vatRegime === "normal" ? "Regime normal de IVA" : "Isento de IVA (artigo 53.º)"}</span>
    </div>
  </div>

  <p class="lab">Serviço</p>
  <p style="margin:0 0 4px">${esc(s.booking.service)} · ${esc(s.booking.guests)} pessoas</p>
  <p class="muted" style="margin:0">Reserva ${esc(s.booking.ref)} · ${esc(day(s.booking.date))}</p>

  <table>
    ${rows.map(([label, value]) => `<tr><td>${esc(label)}</td><td class="n">${esc(value)}</td></tr>`).join("\n    ")}
    <tr class="total"><td>Valor transferido</td><td class="n">${esc(euro(s.amounts.payout))}</td></tr>
  </table>

  <table style="margin-top:24px">
    <tr><td>Conta de destino</td><td class="n">•••• ${esc(s.transfer.ibanLast4)}</td></tr>
    <tr><td>Data da transferência</td><td class="n">${esc(day(s.transfer.paidAt))}</td></tr>
    <tr><td>Referência bancária</td><td class="n">${esc(s.transfer.bankReference ?? "—")}</td></tr>
  </table>

  <div class="note">
    <p style="margin:0 0 8px"><strong>Este documento não é uma fatura.</strong> Comprova o pagamento ao chef do sinal recebido do cliente,
    deduzida a comissão do Ao Lume. Não dispensa a emissão de fatura pelo chef ao cliente pelo serviço prestado, nem a fatura da comissão
    emitida pelo Ao Lume ao chef.</p>
    <p style="margin:0">Emitido ao abrigo do contrato de intermediação de pagamentos, versão ${esc(s.agreementVersion)}, aceite pelo chef na
    sua conta. Divergências devem ser comunicadas ao Ao Lume no prazo de 15 dias.</p>
  </div>
</div>
</html>
`;
}
