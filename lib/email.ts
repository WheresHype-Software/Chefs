import "server-only";
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
