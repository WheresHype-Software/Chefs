// Supabase sends the sign-up confirmation and password reset itself (not lib/email.ts), with the
// templates pasted in its dashboard (Authentication → Emails → Templates). This writes those
// templates with the same design as our own emails, both languages in one file: Supabase picks
// by the account's language, saved as user metadata "locale" at sign-up ('en-GB' or 'pt-PT').
//
//   NEXT_PUBLIC_SITE_URL=https://aolume.com node --import ./scripts/test-resolver.mjs scripts/auth-email-templates.mts
//
// Writes supabase/templates/{confirmation,recovery}.html and prints the subjects to use.
import { writeFileSync } from "node:fs";
import { renderEmail } from "@/lib/email-template";
import { getTranslator } from "@/lib/i18n/translator";

const LINK = "https://supabase-confirmation-url.invalid/";
const kinds = { confirmation: "confirm", recovery: "recovery" } as const;

for (const [file, key] of Object.entries(kinds)) {
  const html = (locale: "pt" | "en") => {
    const e = getTranslator(locale, "emails");
    // {name} becomes ", Marta" when the account has a name (Go template, resolved by Supabase).
    const lead = e(`auth.${key}.lead`, { name: "{{ if .Data.name }}, {{ .Data.name }}{{ end }}" });
    return renderEmail(
      {
        preheader: e(`auth.${key}.preheader`),
        heading: e(`auth.${key}.heading`),
        lead,
        cta: { label: e(`auth.${key}.cta`), href: LINK },
        footnote: e(`auth.${key}.footnote`),
      },
      locale,
    ).html.replaceAll(LINK, "{{ .ConfirmationURL }}");
  };
  const out = `{{ if eq .Data.locale "en-GB" }}${html("en")}{{ else }}${html("pt")}{{ end }}\n`;
  writeFileSync(`supabase/templates/${file}.html`, out);
  const pt = getTranslator("pt", "emails");
  const en = getTranslator("en", "emails");
  console.log(`${file}: subject = "${pt(`auth.${key}.subject`)} · ${en(`auth.${key}.subject`)}"`);
}
