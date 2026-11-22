import "server-only";
import { siteUrl } from "./email";
import { publicEnv } from "./env";
import { hashedEmail, hashedPhone } from "./meta-hash";
import { serverEnv } from "./env.server";
import { createAdminClient } from "./supabase/admin";

/**
 * Meta Conversions API: events the browser cannot send, because they happen away from the
 * visitor's screen (a deposit confirmed by the payment provider).
 *
 * Consent comes first. The browser's Meta ids are stored with a booking only when the visitor
 * had accepted marketing cookies (rememberAdSignals), and a payment event is sent only for
 * bookings that have them. Email and phone leave hashed (SHA-256), as Meta requires.
 *
 * Never throws: measurement must not get in the way of a booking or a payment.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export type AdSignals = { fbp: string | null; fbc: string | null; ip: string | null | undefined; userAgent: string | null };

/** Keeps the browser's Meta ids with a new booking. Call only when the visitor consented. */
export async function rememberAdSignals(bookingId: string, s: AdSignals): Promise<void> {
  try {
    const sb = createAdminClient();
    if (!sb || !capiReady()) return;
    const { error } = await sb.from("booking_ad_signals").upsert({
      booking_id: bookingId,
      fbp: s.fbp?.slice(0, 200) || null,
      fbc: s.fbc?.slice(0, 500) || null,
      client_ip: s.ip?.slice(0, 64) || null,
      user_agent: s.userAgent?.slice(0, 500) || null,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[meta-capi] rememberAdSignals:", err);
  }
}

function capiReady(): boolean {
  return Boolean(publicEnv.metaPixelId && serverEnv.metaCapiToken);
}

type CapiEvent = {
  event_name: string;
  event_id: string;
  event_time: number;
  action_source: "website";
  event_source_url: string;
  user_data: Record<string, string | string[]>;
  custom_data?: Record<string, unknown>;
};

async function send(event: CapiEvent): Promise<boolean> {
  const res = await fetch(`${GRAPH}/${publicEnv.metaPixelId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      data: [event],
      access_token: serverEnv.metaCapiToken,
      ...(serverEnv.metaTestEventCode ? { test_event_code: serverEnv.metaTestEventCode } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) console.error(`[meta-capi] ${event.event_name} ${res.status}:`, (await res.text()).slice(0, 300));
  return res.ok;
}

/**
 * Purchase for a booking whose deposit was just confirmed. Sent once: the caller runs it only
 * on the call that marked the payment paid, and the stored signals are deleted after sending.
 */
export async function sendPurchase(bookingId: string): Promise<void> {
  try {
    const sb = createAdminClient();
    if (!sb || !capiReady()) return;
    const { data: signals } = await sb
      .from("booking_ad_signals")
      .select("fbp, fbc, client_ip, user_agent")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (!signals) return; // No consent at booking time: nothing is sent.
    const { data } = await sb
      .from("bookings")
      .select("booking_value, quoted_price, estimate, deposit_amount, clients(email, phone)")
      .eq("id", bookingId)
      .maybeSingle();
    if (!data) return;
    const b = data as unknown as {
      booking_value: string | number | null;
      quoted_price: string | number | null;
      estimate: string | number | null;
      deposit_amount: string | number | null;
      clients: { email: string | null; phone: string | null } | null;
    };
    const value = Number(b.booking_value ?? b.quoted_price ?? b.estimate ?? b.deposit_amount ?? 0);
    const em = hashedEmail(b.clients?.email);
    const ph = hashedPhone(b.clients?.phone);
    const user_data: Record<string, string | string[]> = {
      ...(em ? { em: [em] } : {}),
      ...(ph ? { ph: [ph] } : {}),
      ...(signals.fbp ? { fbp: signals.fbp } : {}),
      ...(signals.fbc ? { fbc: signals.fbc } : {}),
      ...(signals.client_ip ? { client_ip_address: signals.client_ip } : {}),
      ...(signals.user_agent ? { client_user_agent: signals.user_agent } : {}),
    };
    const sent = await send({
      event_name: "Purchase",
      event_id: `purchase_${bookingId}`,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: siteUrl(`/reserva/${bookingId}`),
      user_data,
      custom_data: { value: Math.round(value * 100) / 100, currency: "EUR" },
    });
    // The ids have done their job: they are not kept beyond the event they were collected for.
    if (sent) await sb.from("booking_ad_signals").delete().eq("booking_id", bookingId);
  } catch (err) {
    console.error("[meta-capi] sendPurchase:", err);
  }
}
