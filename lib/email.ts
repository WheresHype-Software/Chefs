import "server-only";

type Mail = { to: string; subject: string; text: string; html?: string };

/**
 * Sends a transactional email through Resend when RESEND_API_KEY is set.
 * Without a key (local dev, demo) the message is logged instead.
 */
export async function sendEmail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ao Lume <reservas@aolume.pt>";
  if (!key) {
    console.info(`[email:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) console.error(`[email] Resend ${res.status}: ${await res.text()}`);
}

export function siteUrl(path = ""): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "") + path;
}
