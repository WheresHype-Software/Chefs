import "server-only";
import { sendEmail } from "./email";
import { renderEmail } from "./email-template";
import { chefTitle } from "./format";
import { clientLocaleFrom } from "./i18n/recipient";
import { getTranslator } from "./i18n/translator";
import { createAdminClient } from "./supabase/admin";

/** Today in Portugal as YYYY-MM-DD, whatever the server's own time zone. */
export function lisbonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(now);
}

/**
 * Asks the client for a review right after the chef marks the booking completed. The link carries
 * a fresh guest token, so it opens the booking (and its review form) without an account.
 * Best effort: a failure is logged and never undoes the completion. In the client's language.
 */
export async function sendReviewRequest(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const { data: b } = await admin
      .from("bookings")
      .select("client_id, offer_title, clients(email, name, locale, profiles(locale)), chefs(display_name, badges)")
      .eq("id", bookingId)
      .single();
    const client = b?.clients as unknown as { email: string; name: string | null; locale: string | null; profiles: { locale: string | null } | null } | null;
    const chef = b?.chefs as unknown as { display_name: string; badges: string[] } | null;
    if (!b || !client?.email || !chef) return;
    const { data: token } = await admin.rpc("new_guest_token", { p_client_id: b.client_id });
    if (!token) return;
    const locale = clientLocaleFrom(client);
    const who = `${chefTitle(chef.badges, locale)} ${chef.display_name}`;
    const e = getTranslator(locale, "emails");
    const doc = renderEmail(
      {
        preheader: e("reviewRequest.preheader", { chef: who }),
        heading: e("reviewRequest.heading", { chef: who }),
        lead: e("reviewRequest.lead", { offer: b.offer_title }),
        paragraphs: [e("reviewRequest.body")],
        cta: { label: e("reviewRequest.cta", { chef: who }), href: `/reserva/${bookingId}?t=${token}` },
        footnote: e("reviewRequest.footnote"),
      },
      locale,
    );
    await sendEmail({ to: client.email, subject: e("reviewRequest.subject", { chef: who }), text: doc.text, html: doc.html });
  } catch (err) {
    console.error("[review request]", err);
  }
}
