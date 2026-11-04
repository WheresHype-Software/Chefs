/**
 * The look of every Ao Lume email: the azulejo strip with its one yolk tile, the pan logo, one
 * cobalt action and the cobalt-deep foot the site ends with. Content arrives as data, so the
 * plain-text copy of each message is written from exactly the same words as the HTML one.
 *
 * Built as tables with inline styles: Outlook and Gmail drop stylesheets, flexbox and grid.
 */
import { siteUrl } from "./env";

export type EmailDoc = {
  /** The grey line the inbox shows next to the subject. */
  preheader: string;
  heading: string;
  lead?: string;
  /** What the reader needs before deciding, as label and value. */
  facts?: [string, string][];
  paragraphs?: string[];
  /** A path ("/admin#aprovar") or a full URL. */
  cta?: { label: string; href: string };
  footnote?: string;
  /** A word beside the logo, for mail that is not from the client's side ("Administração"). */
  tag?: string;
};

const INK = "#142033";
const INK_3 = "#37435c";
const MUTED = "#535e76";
const PAPER = "#f3f6fb";
const LINE = "#dde4ef";
const COBALT = "#1d4aa1";
const COBALT_DEEP = "#12306e";
const YOLK = "#f0b429";
const FONT = "'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const absolute = (href: string) => (href.startsWith("/") ? siteUrl(href) : href);

/** The wall: twelve cobalt tiles with white grout between them, and the single warm one. */
function tileStrip(): string {
  const cells = Array.from({ length: 12 }, (_, i) => {
    const grout = i === 11 ? "" : "border-right:2px solid #ffffff;";
    return `<td width="8.33%" height="10" style="width:8.33%;height:10px;background:${i === 8 ? YOLK : COBALT};${grout}font-size:0;line-height:10px;">&nbsp;</td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
}

function factRows(facts: [string, string][]): string {
  const rows = facts
    .map(
      ([label, value]) =>
        `<tr><td style="padding:11px 0;border-top:1px solid ${LINE};">` +
        `<div style="font-family:${FONT};font-size:13px;line-height:1.4;color:${MUTED};">${esc(label)}</div>` +
        `<div style="font-family:${FONT};font-size:16px;line-height:1.5;font-weight:600;color:${INK};">${esc(value)}</div>` +
        `</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;">${rows}</table>`;
}

function button(cta: { label: string; href: string }): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;"><tr>` +
    `<td align="center" bgcolor="${COBALT}" style="border-radius:6px;">` +
    `<a href="${esc(absolute(cta.href))}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:16px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(cta.label)}</a>` +
    `</td></tr></table>`
  );
}

export function renderEmail(doc: EmailDoc): { html: string; text: string } {
  const paragraphs = [...(doc.lead ? [doc.lead] : []), ...(doc.paragraphs ?? [])];
  const body =
    paragraphs
      .map(
        (p, i) =>
          `<p style="margin:${i === 0 ? "14px" : "12px"} 0 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK_3};">${esc(p)}</p>`,
      )
      .join("") +
    (doc.facts?.length ? factRows(doc.facts) : "") +
    (doc.cta ? button(doc.cta) : "") +
    (doc.footnote
      ? `<p style="margin:26px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED};">${esc(doc.footnote)}</p>`
      : "");

  const html = `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(doc.heading)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;">${esc(doc.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:12px;overflow:hidden;">
<tr><td style="font-size:0;line-height:0;">${tileStrip()}</td></tr>
<tr><td style="padding:26px 30px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" style="vertical-align:middle;"><img src="${siteUrl("/email/logo.png")}" width="120" height="32" alt="Ao Lume" style="display:block;border:0;outline:none;text-decoration:none;"></td>
${doc.tag ? `<td align="right" style="vertical-align:middle;font-family:${FONT};font-size:13px;font-weight:600;color:${MUTED};">${esc(doc.tag)}</td>` : ""}
</tr></table>
</td></tr>
<tr><td style="padding:22px 30px 32px;">
<h1 style="margin:0;font-family:${FONT};font-size:24px;line-height:1.2;letter-spacing:-0.02em;font-weight:700;color:${INK};">${esc(doc.heading)}</h1>
${body}
</td></tr>
<tr><td style="background:${COBALT_DEEP};padding:20px 30px;">
<div style="font-family:${FONT};font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">ao lume</div>
<div style="margin-top:4px;font-family:${FONT};font-size:13px;line-height:1.6;color:#c9d6ee;">Chefs e cozinheiros caseiros perto de si · <a href="${siteUrl("/")}" style="color:#ffffff;text-decoration:none;">aolume.com</a></div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [
    doc.heading,
    "",
    ...paragraphs.flatMap((p) => [p, ""]),
    ...(doc.facts?.length ? [...doc.facts.map(([label, value]) => `${label}: ${value}`), ""] : []),
    ...(doc.cta ? [`${doc.cta.label}: ${absolute(doc.cta.href)}`, ""] : []),
    ...(doc.footnote ? [doc.footnote, ""] : []),
    "Ao Lume",
  ].join("\n");

  return { html, text };
}
