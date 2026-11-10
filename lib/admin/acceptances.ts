import "server-only";
import { currentText } from "../acceptance";
import { sha256 } from "../crypto";
import { siteUrl } from "../env";
import { COMPANY, EMAIL } from "../legal";
import { createClient } from "../supabase/server";
import { TERMS_UPDATED } from "../terms";
import type { CertificateData } from "./acceptance-certificate";

/** Who accepted what: every chef account with its acceptances, for /admin/chefs/contratos. */
export type AcceptanceRecord = {
  id: string;
  kind: "terms" | "chef_contract";
  version: string;
  text_sha256: string;
  context: string;
  accepted_at: string;
  email_sent_at: string | null;
  revoked_at: string | null;
};

export type AcceptanceRow = {
  userId: string;
  name: string | null;
  email: string | null;
  chef: { id: string; display_name: string; slug: string; status: string } | null;
  contract: AcceptanceRecord | null;
  terms: AcceptanceRecord | null;
  contractCurrent: boolean;
  termsCurrent: boolean;
  history: AcceptanceRecord[];
};

export async function getAcceptanceRoster(): Promise<AcceptanceRow[]> {
  const sb = await createClient();
  const [chefs, chefProfiles, acceptances] = await Promise.all([
    sb.from("chefs").select("id, profile_id, display_name, slug, status").not("profile_id", "is", null),
    sb.from("profiles").select("id, name, email").eq("role", "chef"),
    sb
      .from("legal_acceptances")
      .select("id, user_id, kind, version, text_sha256, context, accepted_at, email_sent_at, revoked_at")
      .order("accepted_at", { ascending: false }),
  ]);
  if (acceptances.error) console.error("[admin] legal_acceptances:", acceptances.error);

  type ChefRow = { id: string; profile_id: string; display_name: string; slug: string; status: string };
  const chefByUser = new Map(((chefs.data ?? []) as ChefRow[]).map((c) => [c.profile_id, c]));
  const profiles = new Map(
    ((chefProfiles.data ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [p.id, p]),
  );

  // An admin with a chef page has role "admin": fetch the profiles the first query missed.
  const missing = [...chefByUser.keys()].filter((id) => !profiles.has(id));
  if (missing.length) {
    const { data } = await sb.from("profiles").select("id, name, email").in("id", missing);
    for (const p of (data ?? []) as { id: string; name: string | null; email: string | null }[]) profiles.set(p.id, p);
  }

  const byUser = new Map<string, AcceptanceRecord[]>();
  for (const a of (acceptances.data ?? []) as (AcceptanceRecord & { user_id: string | null })[]) {
    if (!a.user_id) continue;
    byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a]);
  }

  const contractSha = currentText("chef_contract").sha256;
  return [...profiles.values()]
    .map((p) => {
      const history = byUser.get(p.id) ?? [];
      const live = history.filter((a) => !a.revoked_at);
      return {
        userId: p.id,
        name: p.name,
        email: p.email,
        chef: chefByUser.get(p.id) ?? null,
        contract: live.find((a) => a.kind === "chef_contract") ?? null,
        terms: live.find((a) => a.kind === "terms") ?? null,
        contractCurrent: live.some((a) => a.kind === "chef_contract" && a.text_sha256 === contractSha),
        termsCurrent: live.some((a) => a.kind === "terms" && a.version === TERMS_UPDATED),
        history,
      };
    })
    .sort((a, b) => (a.chef?.display_name ?? a.name ?? "").localeCompare(b.chef?.display_name ?? b.name ?? "", "pt"));
}

/** Everything the certificate states, read with the admin's own session (RLS: admins only). */
export async function getCertificateData(acceptanceId: string): Promise<CertificateData | null> {
  const sb = await createClient();
  const { data: row } = await sb.from("legal_acceptances").select("*").eq("id", acceptanceId).maybeSingle();
  if (!row) return null;
  const a = row as {
    id: string;
    user_id: string | null;
    kind: "terms" | "chef_contract";
    version: string;
    text_sha256: string;
    consent_text: string;
    context: string;
    account_email: string | null;
    account_name: string | null;
    ip: string | null;
    user_agent: string | null;
    accepted_at: string;
    email_sent_at: string | null;
    revoked_at: string | null;
  };

  const [text, profile, chef] = await Promise.all([
    sb.from("legal_texts").select("title, body").eq("sha256", a.text_sha256).maybeSingle(),
    a.user_id ? sb.from("profiles").select("name, email").eq("id", a.user_id).maybeSingle() : Promise.resolve({ data: null }),
    a.user_id ? sb.from("chefs").select("id, display_name").eq("profile_id", a.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const chefRow = chef.data as { id: string; display_name: string } | null;
  const billing = chefRow ? (await sb.from("chef_billing").select("legal_name, nif").eq("chef_id", chefRow.id).maybeSingle()).data : null;
  const prof = profile.data as { name: string | null; email: string | null } | null;
  const t = text.data as { title: string; body: string } | null;

  return {
    issuedAt: new Date().toISOString(),
    platform: { name: COMPANY.name, nif: COMPANY.nif, address: COMPANY.address, email: EMAIL.legal },
    acceptance: {
      id: a.id,
      kind: a.kind,
      version: a.version,
      textSha256: a.text_sha256,
      consentText: a.consent_text,
      context: a.context,
      acceptedAt: a.accepted_at,
      ip: a.ip,
      userAgent: a.user_agent,
      emailSentAt: a.email_sent_at,
      revokedAt: a.revoked_at,
    },
    person: {
      userId: a.user_id,
      accountName: a.account_name ?? prof?.name ?? null,
      accountEmail: a.account_email ?? prof?.email ?? null,
      emailIsCurrent: !a.account_email && Boolean(prof?.email),
      legalName: (billing?.legal_name as string | null) ?? null,
      nif: (billing?.nif as string | null) ?? null,
      chefId: chefRow?.id ?? null,
      chefName: chefRow?.display_name ?? null,
    },
    // The hash is recomputed here, not trusted from the row: the certificate says what it checked.
    text: t ? { title: t.title, body: t.body, matches: sha256(t.body) === a.text_sha256 } : null,
    archiveUrl: siteUrl(`/arquivo/${a.text_sha256}`),
  };
}
