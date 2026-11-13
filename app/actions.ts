"use server";

import { announceBooking } from "@/lib/notify/discord";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { bookingTokenCookieName, bookingTokenCookieOptions } from "@/lib/booking-token";
import { sendEmail, siteUrl } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { escapeLike, profileLocaleFrom } from "@/lib/i18n/recipient";
import { localizePath, toDbLocale, type Locale } from "@/lib/i18n/routing";
import { requestTranslator } from "@/lib/i18n/server";
import { getTranslator } from "@/lib/i18n/translator";
import { createAdminClient } from "@/lib/supabase/admin";
import { failInvalid } from "@/lib/result";
import { createAnonClient, createClient, hasSupabase } from "@/lib/supabase/server";
import { longDay, titledName } from "@/lib/format";
import { paymentsLive } from "@/lib/settings";

const BookingInput = z.object({
  offerId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().min(1).max(60),
  guests: z.number().int().min(1).max(200),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().max(300).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().trim().max(2000).optional(),
});

/** Fields with a label (or a whole sentence ending in ".") in errors.booking.fields. */
const BOOKING_FIELDS = ["offerId", "date", "time", "guests", "name", "email", "phone", "address", "notes"] as const;

export type BookingResult =
  | {
      ok: true;
      bookingId: string;
      ref: string;
      link: string;
      /** Full link with the guest token: the way back to the booking without an account. */
      privateLink: string;
      /** Whether the confirmation email actually went out. */
      emailed: boolean;
    }
  | { ok: false; error: string };

/** Errors raised by request_booking, each translated in errors.booking.rpc. */
const RPC_ERRORS = [
  "invalid_email",
  "phone_required",
  "offer_not_found",
  "chef_not_available",
  "guests_out_of_range",
  "too_late_for_this_date",
  "date_not_available",
  "address_required",
  "outside_service_area",
  "too_many_requests",
  "cannot_book_own_offer",
] as const;

/** The day as data: ISO in Portuguese emails (as they always were), spelled out in English. */
const emailDay = (iso: string, locale: Locale) => (locale === "pt" ? iso : longDay(iso, locale));

export async function requestBooking(input: z.infer<typeof BookingInput>): Promise<BookingResult> {
  const locale = (await getLocale()) as Locale;
  const t = getTranslator(locale, "errors");
  const parsed = BookingInput.safeParse(input);
  if (!parsed.success) {
    const labels = Object.fromEntries(BOOKING_FIELDS.map((f) => [f, t(`booking.fields.${f}`)]));
    const invalid = failInvalid(parsed.error, t, labels);
    return { ok: false, error: invalid.ok ? "" : invalid.error };
  }
  const b = parsed.data;

  if (!hasSupabase) {
    // Demo mode: nothing is stored, the status page shows an example booking.
    return {
      ok: true,
      bookingId: "demo",
      ref: "AL-DEMO",
      link: "/reserva/demo",
      privateLink: siteUrl(localizePath("/reserva/demo", locale)),
      emailed: false,
    };
  }

  const sb = await createClient();
  const { data, error } = await sb.rpc("request_booking", {
    p_offer_id: b.offerId,
    p_date: b.date,
    p_time: b.time,
    p_guests: b.guests,
    p_name: b.name,
    p_email: b.email,
    p_phone: b.phone,
    p_address: b.address ?? null,
    p_lat: b.lat ?? null,
    p_lng: b.lng ?? null,
    p_notes: b.notes ?? null,
  });
  if (error) {
    const key = RPC_ERRORS.find((k) => error.message.includes(k));
    if (!key) console.error("[action] requestBooking:", error);
    return { ok: false, error: key ? t(`booking.rpc.${key}`) : t("booking.sendFailed") };
  }

  const r = data as { bookingId: string; ref: string; token: string; chefName: string };
  // Every later email about this client's bookings goes out in the language they booked in.
  await rememberClientLocale(b.email, locale);
  const { data: offer } = await sb.from("offers").select("title, fulfilment_mode, chefs(badges)").eq("id", b.offerId).maybeSingle();
  const chef = { name: r.chefName, badges: (offer?.chefs as unknown as { badges: string[] } | null)?.badges ?? [] };
  // The client is the visitor, so their email is in the page's language.
  const chefName = titledName(chef, locale);
  // This browser gets the token as an httpOnly cookie; the email carries it once in the link.
  (await cookies()).set(bookingTokenCookieName(r.bookingId), r.token, bookingTokenCookieOptions(r.bookingId));
  const link = `/reserva/${r.bookingId}`;
  const emailLink = `${link}?t=${r.token}`;
  // The booking exists from here on: email problems are logged, never shown as a failed request.
  const live = await paymentsLive();
  const e = getTranslator(locale, "emails");
  const clientDoc = renderEmail(
    {
      preheader: e("bookingRequest.client.preheader", { chef: chefName }),
      heading: e("bookingRequest.client.heading", { chef: chefName }),
      lead: e("bookingRequest.client.lead", { name: b.name.split(" ")[0] ?? b.name, chef: chefName }),
      facts: [
        [e("facts.request"), r.ref],
        [e("facts.when"), e("facts.dateTime", { date: emailDay(b.date, locale), time: b.time })],
        [e("facts.guests"), String(b.guests)],
      ],
      paragraphs: [live ? e("bookingRequest.client.depositLater", { chef: chefName }) : e("bookingRequest.client.payChef")],
      cta: { label: e("bookingRequest.client.cta"), href: emailLink },
      footnote: e("bookingRequest.client.footnote"),
    },
    locale,
  );
  const emailed = await sendEmail({
    to: b.email,
    subject: e("bookingRequest.client.subject", { ref: r.ref, chef: chefName }),
    text: clientDoc.text,
    html: clientDoc.html,
  }).catch((err) => {
    console.error("[action] requestBooking client email:", err);
    return false;
  });
  await notifyChef(r.bookingId, r.ref, b).catch((err) => console.error("[action] requestBooking chef email:", err));
  // Discord is the team's: Portuguese.
  await announceBooking({
    ref: r.ref,
    chefName: titledName(chef),
    clientName: b.name,
    guests: b.guests,
    offerTitle: (offer?.title as string | undefined) ?? "Oferta",
    mode: (offer?.fulfilment_mode as string | undefined) ?? null,
    date: b.date,
    time: b.time,
    notes: b.notes,
  });
  return { ok: true, bookingId: r.bookingId, ref: r.ref, link, privateLink: siteUrl(localizePath(emailLink, locale)), emailed };
}

/**
 * Stores the language of this request on the client, and on their account if they have one, so
 * later emails (deposit, confirmation, review) speak it. Best effort: a failure means Portuguese.
 */
async function rememberClientLocale(email: string, locale: Locale): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const { data, error } = await admin
      .from("clients")
      .update({ locale: toDbLocale(locale) })
      .ilike("email", escapeLike(email))
      .select("profile_id");
    if (error) throw error;
    const accounts = ((data ?? []) as { profile_id: string | null }[]).flatMap((c) => (c.profile_id ? [c.profile_id] : []));
    if (accounts.length) {
      const { error: accountError } = await admin.from("profiles").update({ locale: toDbLocale(locale) }).in("id", accounts);
      if (accountError) throw accountError;
    }
  } catch (err) {
    console.error("[action] requestBooking locale:", err);
  }
}

async function notifyChef(bookingId: string, ref: string, b: z.infer<typeof BookingInput>) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin.from("bookings").select("offer_title, chefs(display_name, profiles(email, locale))").eq("id", bookingId).single();
  const chef = data?.chefs as unknown as { display_name: string; profiles: { email: string; locale: string | null } | null } | null;
  if (!chef?.profiles?.email) return;
  // The chef's language, not the client's.
  const locale = profileLocaleFrom(chef.profiles);
  const e = getTranslator(locale, "emails");
  const offer = (data?.offer_title as string | undefined) ?? "";
  const doc = renderEmail(
    {
      preheader: e("bookingRequest.chef.preheader", { client: b.name, offer, date: emailDay(b.date, locale) }),
      heading: e("bookingRequest.chef.heading"),
      lead: e("bookingRequest.chef.lead", { name: chef.display_name.split(" ")[0] ?? chef.display_name, client: b.name }),
      facts: [
        [e("facts.service"), offer || "—"],
        [e("facts.when"), e("facts.dateTime", { date: emailDay(b.date, locale), time: b.time })],
        [e("facts.guests"), String(b.guests)],
        ...((b.address ? [[e("facts.where"), b.address]] : []) as [string, string][]),
      ],
      paragraphs: b.notes ? [e("bookingRequest.chef.notes", { notes: b.notes })] : [],
      cta: { label: e("bookingRequest.chef.cta"), href: `/dashboard/pedidos/${bookingId}` },
      footnote: e("bookingRequest.chef.footnote"),
    },
    locale,
  );
  await sendEmail({ to: chef.profiles.email, subject: e("bookingRequest.chef.subject", { ref, offer }), text: doc.text, html: doc.html });
}

const LookupInput = z.object({
  ref: z.string().trim().min(3).max(40),
  email: z.string().trim().email(),
});

export type LookupResult = { ok: true; link: string } | { ok: false; error: string };

/** "Acompanhar pedido": booking number + email → a fresh guest token in this browser → the booking page. */
export async function findGuestBooking(input: z.infer<typeof LookupInput>): Promise<LookupResult> {
  const t = await requestTranslator("errors");
  const parsed = LookupInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.path[0] === "email" ? t("booking.lookup.invalidEmail") : t("booking.lookup.refRequired") };
  }
  if (!hasSupabase) return { ok: true, link: "/reserva/demo" };
  // People type "1027-0482", "al 1027 0482" or "AL-1027-0482": normalise to the stored form.
  const digits = parsed.data.ref
    .toUpperCase()
    .replace(/^AL/, "")
    .replace(/[^0-9]/g, "");
  const ref = digits.length === 8 ? `AL-${digits.slice(0, 4)}-${digits.slice(4)}` : parsed.data.ref.toUpperCase();
  const { data, error } = await createAnonClient().rpc("find_guest_booking", { p_ref: ref, p_email: parsed.data.email });
  if (error) {
    if (error.message.includes("too_many_attempts")) return { ok: false, error: t("booking.lookup.tooManyAttempts") };
    console.error("[action] findGuestBooking:", error);
    return { ok: false, error: t("booking.lookup.searchFailed") };
  }
  const found = data as { bookingId: string; token: string } | null;
  if (!found) return { ok: false, error: t("booking.lookup.notFound") };
  (await cookies()).set(bookingTokenCookieName(found.bookingId), found.token, bookingTokenCookieOptions(found.bookingId));
  return { ok: true, link: `/reserva/${found.bookingId}` };
}
