import { lisbonStampSeconds, reflow } from "../acceptance-format";
import { FORM_CLAUSE_TITLE } from "../contract";

/**
 * The certificate an admin prints to show that someone accepted the terms or the chef contract.
 *
 * It states what the records hold and nothing more: who, which text (with its hash and whether
 * the archived words still match it), when, how, from which IP and browser, and whether the copy
 * went out by email. The closing statement is honest about what this is — a simple electronic
 * signature, evidence to be weighed, not a qualified signature — and, when the accepted text has
 * the clause on electronic form, quotes it.
 *
 * Pure: everything arrives as data, every value is escaped.
 */
export type CertificateData = {
  issuedAt: string;
  platform: { name: string; nif: string; address: string; email: string };
  acceptance: {
    id: string;
    kind: "terms" | "chef_contract";
    version: string;
    textSha256: string;
    consentText: string;
    context: string;
    acceptedAt: string;
    ip: string | null;
    userAgent: string | null;
    emailSentAt: string | null;
    revokedAt: string | null;
  };
  person: {
    userId: string | null;
    accountName: string | null;
    accountEmail: string | null;
    /** True when the email is today's, because the record predates the snapshot. */
    emailIsCurrent: boolean;
    legalName: string | null;
    nif: string | null;
    chefId: string | null;
    chefName: string | null;
  };
  /** The archived text, when the hash is in the archive. */
  text: { title: string; body: string; matches: boolean } | null;
  /** Where the public copy of the archived text lives. */
  archiveUrl: string;
};

function esc(value: string | number): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CONTEXT: Record<string, string> = {
  signup: "Formulário de criação de conta",
  onboarding: "Painel do chef, passo «Enviar para revisão»",
  dashboard: "Painel do chef, página inicial",
  billing: "Painel do chef, página «Faturação e pagamentos»",
  legacy: "Painel do chef, página «Faturação e pagamentos» (registo anterior, migrado de chef_agreements)",
};

const DOC_LABEL = { terms: "Termos e condições", chef_contract: "Contrato de intermediação de pagamentos" } as const;

/** The script the print button runs, and its CSP hash, so nothing else may run on the page. */
export const PRINT_SCRIPT = `document.getElementById("imprimir").addEventListener("click",function(){window.print()});`;

function formClause(body: string): string | null {
  const m = body.match(new RegExp(`^\\d+\\. ${FORM_CLAUSE_TITLE}\\n([\\s\\S]*?)(?:\\n\\n|$)`, "m"));
  return m?.[1]?.replace(/\n/g, " ").trim() ?? null;
}

export function renderAcceptanceCertificate(d: CertificateData): string {
  const a = d.acceptance;
  const p = d.person;
  const doc = d.text?.title ?? DOC_LABEL[a.kind];
  const version = a.kind === "terms" ? `versão de ${a.version}` : `versão ${a.version}`;
  const who = p.legalName ?? p.accountName ?? p.chefName ?? "—";
  const clause = d.text?.matches ? formClause(d.text.body) : null;
  const signup = a.context === "signup";

  const rows = (items: [string, string | null][]) =>
    items.map(([label, value]) => `<tr><th>${esc(label)}</th><td>${value == null || value === "" ? "—" : value}</td></tr>`).join("");

  const textCheck = !d.text
    ? `<span class="bad">O texto com esta impressão digital não está no arquivo.</span>`
    : d.text.matches
      ? `<span class="ok">Verificado: o texto arquivado, reproduzido em anexo, tem exatamente esta impressão digital.</span>`
      : `<span class="bad">Atenção: o texto arquivado não corresponde a esta impressão digital.</span>`;

  const statement = [
    `<p>O Ao Lume certifica, com base nos registos da sua plataforma, que a pessoa identificada acima aceitou por via eletrónica o documento «${esc(doc)}», ${esc(version)}, na data, hora e pela forma indicadas. A aceitação foi feita marcando uma caixa de confirmação que não estava pré-preenchida e enviando o formulário, ${
      signup
        ? "no formulário de criação de conta, com o email e a palavra-passe escolhidos pela própria pessoa"
        : "na conta da própria pessoa, com sessão iniciada"
    }.</p>`,
    clause
      ? `<p>No texto aceite, as partes convencionaram que esta aceitação eletrónica vale como assinatura do chef, em substituição de assinatura manuscrita (cláusula «${esc(FORM_CLAUSE_TITLE)}»):</p><blockquote>${esc(clause)}</blockquote>`
      : a.kind === "chef_contract"
        ? `<p>A versão aceite não contém cláusula sobre a forma. O contrato não está sujeito a forma especial (artigo 219.º do Código Civil) e foi celebrado por esta aceitação eletrónica.</p>`
        : `<p>Os termos e condições não estão sujeitos a forma especial (artigo 219.º do Código Civil) e foram aceites por esta via eletrónica.</p>`,
    `<p>Esta aceitação constitui uma assinatura eletrónica simples, na aceção do Regulamento (UE) n.º 910/2014 (eIDAS), cujo efeito jurídico e admissibilidade como prova não podem ser negados por ser eletrónica (artigo 25.º, n.º 1). Não é uma assinatura eletrónica qualificada: o seu valor probatório é apreciado nos termos gerais de direito (Decreto-Lei n.º 12/2021).</p>`,
  ].join("");

  return `<!doctype html>
<html lang="pt-PT">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificado de aceitação · ${esc(who)}</title>
<style>
  :root { color-scheme: light }
  body { margin: 0; padding: 32px 16px; background: #f3f6fb; color: #142033;
         font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif }
  .sheet { max-width: 780px; margin: 0 auto; background: #fff; padding: 40px; border: 1px solid #dde4ef }
  h1 { font-size: 24px; margin: 0 0 4px }
  h2 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #535e76; margin: 30px 0 6px }
  .muted { color: #535e76 }
  table { width: 100%; border-collapse: collapse }
  th, td { text-align: left; vertical-align: top; padding: 8px 0; border-bottom: 1px solid #dde4ef }
  th { width: 34%; padding-right: 16px; font-weight: 600; color: #37435c }
  td { word-break: break-word }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px }
  .ok { color: #1c6b3a } .bad { color: #a32020; font-weight: 600 }
  blockquote { margin: 10px 0; padding: 10px 16px; border-left: 3px solid #1d4aa1; background: #f3f6fb }
  .annex { white-space: pre-wrap; font-size: 13px; line-height: 1.55; border: 1px solid #dde4ef; padding: 18px; margin: 0 }
  .bar { max-width: 780px; margin: 0 auto 14px; display: flex; justify-content: flex-end }
  button { font: inherit; font-weight: 600; padding: 9px 16px; border: 0; border-radius: 6px; background: #1d4aa1; color: #fff; cursor: pointer }
  .foot { margin-top: 30px; padding-top: 14px; border-top: 1px solid #dde4ef; font-size: 13px; color: #535e76 }
  .break { break-before: page }
  @media (max-width: 560px) { .sheet { padding: 22px } th { width: 40% } }
  @media print { body { background: #fff; padding: 0 } .sheet { border: 0; padding: 0; max-width: none } .bar { display: none } }
</style>
<div class="bar"><button id="imprimir" type="button">Imprimir ou guardar em PDF</button></div>
<div class="sheet">
  <h2 style="margin-top:0">${esc(d.platform.name)} · Ao Lume</h2>
  <h1>Certificado de aceitação eletrónica</h1>
  <p class="muted" style="margin:0">Referência ${esc(a.id)}</p>

  <h2>Quem aceitou</h2>
  <table>${rows([
    ["Nome legal", p.legalName ? esc(p.legalName) : `<span class="muted">não indicado nos dados de faturação</span>`],
    ["Nome na conta", p.accountName ? esc(p.accountName) : null],
    ["Nome público de chef", p.chefName ? esc(p.chefName) : null],
    ["NIF", p.nif ? `${esc(p.nif)} <span class="muted">(dados de faturação atuais)</span>` : `<span class="muted">não indicado</span>`],
    [
      "Email da conta",
      p.accountEmail
        ? `${esc(p.accountEmail)}${p.emailIsCurrent ? ` <span class="muted">(email atual; o registo não guardou o email do momento)</span>` : ""}`
        : null,
    ],
    ["Identificador da conta", p.userId ? `<span class="mono">${esc(p.userId)}</span>` : `<span class="muted">conta eliminada</span>`],
    ["Identificador do chef", p.chefId ? `<span class="mono">${esc(p.chefId)}</span>` : null],
  ])}</table>

  <h2>O que foi aceite</h2>
  <table>${rows([
    ["Documento", esc(doc)],
    ["Versão", esc(version)],
    ["Impressão digital do texto (SHA-256)", `<span class="mono">${esc(a.textSha256)}</span><br>${textCheck}`],
  ])}</table>

  <h2>Quando e como</h2>
  <table>${rows([
    [
      "Data e hora",
      `${esc(lisbonStampSeconds(a.acceptedAt))}<br><span class="mono muted">${esc(new Date(a.acceptedAt).toISOString())} (UTC)</span>`,
    ],
    ["Onde", esc(CONTEXT[a.context] ?? a.context)],
    ["Frase junto à caixa de confirmação", `«${esc(a.consentText)}»`],
    ["Endereço IP", a.ip ? `<span class="mono">${esc(a.ip)}</span>` : `<span class="muted">não registado</span>`],
    ["Navegador (user-agent)", a.userAgent ? `<span class="mono">${esc(a.userAgent)}</span>` : `<span class="muted">não registado</span>`],
    [
      "Cópia enviada por email",
      a.emailSentAt
        ? `${esc(lisbonStampSeconds(a.emailSentAt))}${p.accountEmail && !p.emailIsCurrent ? `, para ${esc(p.accountEmail)}` : ""}`
        : `<span class="muted">sem registo de envio</span>`,
    ],
    ...(a.revokedAt ? ([["Revogada", `<span class="bad">${esc(lisbonStampSeconds(a.revokedAt))}</span>`]] as [string, string][]) : []),
  ])}</table>

  <h2>Declaração</h2>
  ${statement}

  <p class="foot">Emitido a ${esc(lisbonStampSeconds(d.issuedAt))} por ${esc(d.platform.name)}, NIF ${esc(d.platform.nif)}, ${esc(
    d.platform.address,
  )}, contacto ${esc(d.platform.email)}, a partir dos registos da plataforma Ao Lume.${
    d.text ? ` O texto aceite pode ser consultado em ${esc(d.archiveUrl)}.` : ""
  }</p>

  ${
    d.text
      ? `<div class="break"><h2>Anexo · texto aceite</h2><p class="muted" style="font-size:13px">As linhas de cada parágrafo foram unidas para facilitar a leitura; as palavras são as do texto arquivado, a que se refere a impressão digital.</p><pre class="annex">${esc(reflow(d.text.body))}</pre></div>`
      : `<h2>Anexo</h2><p class="bad">O texto com esta impressão digital não está no arquivo e não pode ser reproduzido.</p>`
  }
</div>
<script>${PRINT_SCRIPT}</script>
</html>`;
}
