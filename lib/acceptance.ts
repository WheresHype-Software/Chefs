import "server-only";
import { headers } from "next/headers";
import { CONTRACT_TITLE, CONTRACT_VERSION, contractText } from "./contract";
import { sha256 } from "./crypto";
import { sendEmail } from "./email";
import { renderEmail, type EmailDoc } from "./email-template";
import { lisbonStamp } from "./acceptance-format";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { TERMS_TITLE, TERMS_UPDATED, termsText } from "./terms";

/**
 * The record that someone accepted the terms or the chef contract.
 *
 * Every acceptance goes through recordAcceptance(), from the sign-up form, the onboarding, the
 * dashboard or the billing page. It archives the exact text (legal_texts, keyed by hash), writes
 * one row per document with who, when, from where and the sentence next to the checkbox, and
 * emails the person a short note with links to the versions they accepted.
 *
 * The rows are written with the secret key: at sign-up there may be no session yet (email
 * confirmation), and no session should be able to write evidence about itself anyway.
 */
export type LegalKind = "terms" | "chef_contract";
export type AcceptanceContext = "signup" | "onboarding" | "dashboard" | "billing";

export type LegalText = { kind: LegalKind; version: string; title: string; body: string; sha256: string };

export function currentText(kind: LegalKind): LegalText {
  const body = kind === "terms" ? termsText() : contractText();
  return {
    kind,
    version: kind === "terms" ? TERMS_UPDATED : String(CONTRACT_VERSION),
    title: kind === "terms" ? TERMS_TITLE : CONTRACT_TITLE,
    body,
    sha256: sha256(body),
  };
}

/** The sentence next to the checkbox. Stored with the acceptance, word for word. */
export function consentText(kinds: readonly LegalKind[]): string {
  const terms = kinds.includes("terms");
  const contract = kinds.includes("chef_contract");
  if (terms && contract) return `Li e aceito os ${TERMS_TITLE} e o ${CONTRACT_TITLE}.`;
  return contract ? `Li e aceito o ${CONTRACT_TITLE}.` : `Li e aceito os ${TERMS_TITLE}.`;
}

/** The visitor's address and browser, as the request arrived. */
export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  // The first address in x-forwarded-for is the visitor; the rest are proxies.
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip: ip?.slice(0, 60) ?? null, userAgent: h.get("user-agent")?.slice(0, 400) ?? null };
}

type Who = { userId: string; email: string | null; name: string | null };

/**
 * Archives the texts, records the acceptances and sends the copy. Returns false only when nothing
 * could be recorded; an email that fails to go out is logged, not fatal.
 */
export async function recordAcceptance(who: Who, kinds: readonly LegalKind[], context: AcceptanceContext): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[acceptance] no secret key: acceptance not recorded");
    return false;
  }
  const texts = kinds.map(currentText);
  const consent = consentText(kinds);
  const { ip, userAgent } = await requestMeta();

  const archived = await admin.from("legal_texts").upsert(
    texts.map((t) => ({ sha256: t.sha256, kind: t.kind, version: t.version, title: t.title, body: t.body })),
    { onConflict: "sha256", ignoreDuplicates: true },
  );
  if (archived.error) {
    console.error("[acceptance] legal_texts:", archived.error);
    return false;
  }

  // Same version, different words: someone edited a text without bumping its version. The
  // acceptance still stands (the hash is the truth), but it must not go unnoticed.
  for (const t of texts) {
    const { data } = await admin.from("legal_texts").select("sha256").eq("kind", t.kind).eq("version", t.version).neq("sha256", t.sha256);
    if (data?.length) console.error(`[acceptance] ${t.kind} v${t.version} has ${data.length + 1} different texts: bump the version`);
  }

  const acceptedAt = new Date().toISOString();
  const { data: rows, error } = await admin
    .from("legal_acceptances")
    .upsert(
      texts.map((t) => ({
        user_id: who.userId,
        kind: t.kind,
        version: t.version,
        text_sha256: t.sha256,
        consent_text: consent,
        context,
        account_email: who.email,
        account_name: who.name,
        ip,
        user_agent: userAgent,
        accepted_at: acceptedAt,
      })),
      { onConflict: "user_id,kind,text_sha256", ignoreDuplicates: true },
    )
    .select("id, kind");
  if (error) {
    console.error("[acceptance] legal_acceptances:", error);
    return false;
  }

  // Already accepted these very words: nothing new to tell anyone.
  const fresh = (rows ?? []) as { id: string; kind: LegalKind }[];
  if (!fresh.length || !who.email) return true;

  try {
    const accepted = texts.filter((t) => fresh.some((r) => r.kind === t.kind));
    const { html, text } = renderEmail(acceptanceEmail(accepted, context, acceptedAt, who.name, kinds.includes("chef_contract")));
    const subject = context === "signup" ? "A sua conta no Ao Lume está criada" : "Registámos a sua aceitação";
    if (await sendEmail({ to: who.email, subject, text, html })) {
      await admin
        .from("legal_acceptances")
        .update({ email_sent_at: new Date().toISOString() })
        .in(
          "id",
          fresh.map((r) => r.id),
        );
    }
  } catch (err) {
    console.error("[acceptance] email:", err);
  }
  return true;
}

/** The welcome email at sign-up, or a short receipt later; both end with what was accepted. */
function acceptanceEmail(texts: LegalText[], context: AcceptanceContext, acceptedAt: string, name: string | null, chef: boolean): EmailDoc {
  const what = texts.map((t) => (t.kind === "terms" ? `os ${t.title} (versão de ${t.version})` : `o ${t.title} (versão ${t.version})`));
  const list = what.length > 1 ? `${what.slice(0, -1).join(", ")} e ${what.at(-1)}` : what[0];
  const when = lisbonStamp(acceptedAt);
  // Short links at the foot; each opens the exact version accepted, not the current one.
  const links = texts.map((t) => ({
    label: t.kind === "terms" ? `${t.title} aceites` : `${t.title} aceite`,
    href: `/arquivo/${t.sha256}`,
  }));
  const hello = name ? `Olá, ${name.split(" ")[0]}.` : "Olá.";

  if (context === "signup") {
    return {
      preheader: chef ? "O próximo passo é criar o seu perfil de chef." : "Já pode procurar chefs perto de si.",
      heading: chef ? "A sua conta de chef está criada" : "Bem-vindo ao Ao Lume",
      lead: chef
        ? `${hello} O próximo passo é criar o seu perfil: três passos, uns dez minutos, e a equipa revê-o antes de ficar público.`
        : `${hello} A sua conta está criada. Já pode procurar chefs perto de si e fazer o seu primeiro pedido.`,
      cta: chef ? { label: "Criar o meu perfil", href: "/dashboard/comecar" } : { label: "Procurar chefs", href: "/" },
      footLinks: links,
    };
  }
  return {
    preheader: `Aceitou ${list}.`,
    heading: "Registámos a sua aceitação",
    lead: `${hello} A ${when}, aceitou ${list}. Guarde este email: as ligações abaixo abrem o texto exato que aceitou, que pode guardar e imprimir.`,
    footLinks: links,
  };
}

/** Whether this account has accepted the current terms and the current contract. */
export async function myAcceptance(userId: string): Promise<{ terms: boolean; contract: boolean }> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("legal_acceptances")
    .select("kind, version, text_sha256")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) {
    // Before the migration runs there is no table: asking everyone to accept something that
    // cannot be recorded would only lock them out. Log it and let them through.
    console.error("[acceptance] myAcceptance:", error);
    return { terms: true, contract: true };
  }
  const rows = (data ?? []) as { kind: LegalKind; version: string; text_sha256: string }[];
  const contract = currentText("chef_contract");
  return {
    // The terms by version: a fixed typo should not send every chef back to a checkbox.
    terms: rows.some((r) => r.kind === "terms" && r.version === TERMS_UPDATED),
    // The contract by its exact words.
    contract: rows.some((r) => r.kind === "chef_contract" && r.text_sha256 === contract.sha256),
  };
}
