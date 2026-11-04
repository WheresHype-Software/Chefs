import "server-only";
import { renderEmail, type EmailDoc } from "./email-template";
import { serverEnv } from "./env.server";

export { siteUrl } from "./env";

type Mail = { to: string; subject: string; text: string; html?: string };

/**
 * Sends a transactional email through Resend when RESEND_API_KEY is set; returns whether it went out.
 * Without a key (local dev, demo, no provider yet) the message is logged instead.
 */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = serverEnv.resendApiKey;
  const from = serverEnv.emailFrom;
  if (!key) {
    console.info(`[email:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) console.error(`[email] Resend ${res.status}: ${await res.text()}`);
  return res.ok;
}

/**
 * Tells the team something is waiting in /admin (a profile sent for review, a certificate to
 * check). Best effort: whatever happens here must never undo what the chef just did.
 */
export async function notifyAdmin(doc: EmailDoc & { subject: string }): Promise<void> {
  try {
    const { html, text } = renderEmail({ tag: "Administração", ...doc });
    await sendEmail({ to: serverEnv.adminEmail, subject: doc.subject, text, html });
  } catch (err) {
    console.error("[email] notifyAdmin:", err);
  }
}
