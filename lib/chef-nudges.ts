import "server-only";
import { sendEmail } from "./email";
import { renderEmail, type EmailDoc } from "./email-template";
import { localesOfProfiles } from "./i18n/recipient";
import { type Locale } from "./i18n/routing";
import { getTranslator } from "./i18n/translator";
import { createAdminClient } from "./supabase/admin";

/**
 * Going back for the people who stopped halfway.
 *
 * Signing up and abandoning is the normal case, not the exception: someone registers on their
 * phone in the evening, has no photographs to hand, closes the tab. The first-steps list only
 * helps whoever comes back on their own.
 *
 * One email per stage per person, recorded before it is sent so a crash cannot turn a reminder
 * into a campaign. Each goes out in the chef's language (profiles.locale).
 */

type Stage = "no_profile" | "draft_incomplete" | "draft_ready";

type Candidate = {
  profile_id: string;
  email: string;
  name: string | null;
  stage: Stage;
  chef_name: string | null;
  since: string;
};

const STAGE_KEY = {
  no_profile: "nudges.noProfile",
  draft_incomplete: "nudges.draftIncomplete",
  draft_ready: "nudges.draftReady",
} as const;

function message(c: Candidate, locale: Locale): { subject: string; doc: EmailDoc } {
  const e = getTranslator(locale, "emails");
  const key = STAGE_KEY[c.stage];
  const first = (c.chef_name ?? c.name ?? "").split(" ")[0] || e("nudges.hello");
  return {
    subject: e(`${key}.subject`),
    doc: {
      preheader: e(`${key}.preheader`),
      heading: e(`${key}.heading`, { name: first }),
      lead: e(`${key}.lead`),
      paragraphs: [e(`${key}.body`), e("nudges.notAgain")],
      cta: { label: e(`${key}.cta`), href: c.stage === "draft_ready" ? "/dashboard/comecar?passo=3" : "/dashboard/comecar" },
    },
  };
}

export async function nudgeStalledChefs(limit = 50): Promise<{ sent: number; skipped: number }> {
  const sb = createAdminClient();
  if (!sb) return { sent: 0, skipped: 0 };

  const { data, error } = await sb.rpc("chefs_to_nudge", { p_limit: limit });
  if (error) {
    console.error("[nudges] chefs_to_nudge:", error.message);
    return { sent: 0, skipped: 0 };
  }

  const candidates = (data ?? []) as Candidate[];
  // Each chef's language in one lookup, rather than a query per email.
  const localeOf = await localesOfProfiles(candidates.map((c) => c.profile_id));

  let sent = 0;
  let skipped = 0;
  for (const c of candidates) {
    // Recorded first: a send that half-works must not be repeated tomorrow.
    const { error: markError } = await sb.rpc("record_chef_nudge", { p_profile: c.profile_id, p_stage: c.stage });
    if (markError) {
      skipped += 1;
      continue;
    }
    const locale = localeOf(c.profile_id);
    const { subject, doc } = message(c, locale);
    const rendered = renderEmail(doc, locale);
    const ok = await sendEmail({ to: c.email, subject, text: rendered.text, html: rendered.html }).catch((err) => {
      console.error("[nudges] send:", err);
      return false;
    });
    if (ok) sent += 1;
    else skipped += 1;
  }
  return { sent, skipped };
}
