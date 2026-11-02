import "server-only";
import { sendEmail, siteUrl } from "./email";
import { chefTitle } from "./format";
import { createAdminClient } from "./supabase/admin";

/** Today in Portugal as YYYY-MM-DD, whatever the server's own time zone. */
export function lisbonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(now);
}

/**
 * Asks the client for a review right after the chef marks the booking completed. The link carries
 * a fresh guest token, so it opens the booking (and its review form) without an account.
 * Best effort: a failure is logged and never undoes the completion.
 */
export async function sendReviewRequest(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const { data: b } = await admin
      .from("bookings")
      .select("client_id, offer_title, clients(email, name), chefs(display_name, badges)")
      .eq("id", bookingId)
      .single();
    const client = b?.clients as unknown as { email: string; name: string | null } | null;
    const chef = b?.chefs as unknown as { display_name: string; badges: string[] } | null;
    if (!b || !client?.email || !chef) return;
    const { data: token } = await admin.rpc("new_guest_token", { p_client_id: b.client_id });
    if (!token) return;
    const who = `${chefTitle(chef.badges)} ${chef.display_name}`;
    await sendEmail({
      to: client.email,
      subject: `Como correu com ${who}?`,
      text: [
        `Olá ${client.name?.split(" ")[0] ?? ""},`.trim(),
        "",
        `Esperamos que tenha gostado de «${b.offer_title}».`,
        `Em 10 segundos pode avaliar ${who}: basta escolher as estrelas.`,
        siteUrl(`/reserva/${bookingId}?t=${token}`),
        "",
        "A sua avaliação ajuda outras pessoas a escolher. Tem 14 dias para avaliar.",
        "",
        "Ao Lume",
      ].join("\n"),
    });
  } catch (err) {
    console.error("[review request]", err);
  }
}
