"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { bookingTokenCookieName, UUID_RE } from "@/lib/booking-token";
import { demoBookingView } from "@/lib/demo-booking";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { BookingStatus, BookingView } from "@/lib/types";

// Server actions are public endpoints: validate every argument, authorise in the database.

const isDemo = (id: string) => !hasSupabase || id === "demo";
const BookingId = z.string().regex(UUID_RE);

/** The guest's magic-link token for this booking, from its httpOnly cookie (if any). */
async function guestToken(bookingId: string): Promise<string | null> {
  return (await cookies()).get(bookingTokenCookieName(bookingId))?.value ?? null;
}

export async function getBookingView(id: string): Promise<BookingView | null> {
  if (isDemo(id)) return demoBookingView();
  if (!BookingId.safeParse(id).success) return null;
  const sb = await createClient();
  const { data, error } = await sb.rpc("booking_view", { p_booking_id: id, p_token: await guestToken(id) });
  return error ? null : (data as BookingView);
}

const MessageBody = z.string().trim().min(1).max(4000);

export async function postMessage(id: string, body: string): Promise<ActionResult> {
  if (isDemo(id)) return ok();
  const input = z.object({ id: BookingId, body: MessageBody }).safeParse({ id, body });
  if (!input.success) return fail("Mensagem inválida.");

  const sb = await createClient();
  const view = await getBookingView(id);
  if (!view) return fail("Reserva não encontrada.");

  if (view.viewer === "chef") {
    const { data: booking } = await sb.from("bookings").select("chef_id, client_id").eq("id", id).single();
    const { data: conv } = await sb
      .from("conversations")
      .select("id")
      .eq("chef_id", booking?.chef_id ?? "")
      .eq("client_id", booking?.client_id ?? "")
      .single();
    if (!conv) return fail("Conversa não encontrada.");
    const { error } = await sb.from("messages").insert({ conversation_id: conv.id, sender: "chef", body: input.data.body });
    return error ? fail("Não foi possível enviar a mensagem.") : ok();
  }

  const { error } = await sb.rpc("client_post_message", { p_booking_id: id, p_body: input.data.body, p_token: await guestToken(id) });
  return error ? fail("Não foi possível enviar a mensagem.") : ok();
}

const ClientActionName = z.enum(["cancel", "accept_proposal"]);

export async function clientAction(id: string, action: z.infer<typeof ClientActionName>): Promise<ActionResult> {
  if (isDemo(id)) return ok();
  const input = z.object({ id: BookingId, action: ClientActionName }).safeParse({ id, action });
  if (!input.success) return fail("Pedido inválido.");
  const sb = await createClient();
  const { error } = await sb.rpc("client_update_booking", { p_booking_id: id, p_action: action, p_token: await guestToken(id) });
  revalidatePath(`/reserva/${id}`);
  return error ? fail("Não foi possível concluir. Atualize a página e tente de novo.") : ok();
}

const ChefUpdateInput = z.object({
  status: z.enum(["accepted", "declined", "change_proposed", "confirmed", "completed", "cancelled"]),
  decline_reason: z.string().trim().max(500).optional(),
  proposed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  proposed_time: z.string().trim().max(40).optional(),
  quoted_price: z.number().finite().min(0).max(100000).optional(),
});

export type ChefUpdate = z.infer<typeof ChefUpdateInput> & { status: BookingStatus };

export async function chefUpdateBooking(id: string, update: ChefUpdate): Promise<ActionResult> {
  if (!hasSupabase) return ok();
  const parsedId = BookingId.safeParse(id);
  // Only the workflow fields a chef may set; the database trigger enforces the transitions.
  const parsed = ChefUpdateInput.safeParse(update);
  if (!parsedId.success || !parsed.success) return fail("Dados inválidos.");
  const sb = await createClient();
  const { error } = await sb.from("bookings").update(parsed.data).eq("id", id);
  revalidatePath("/dashboard", "layout");
  return error ? fail("Não foi possível atualizar a reserva.") : ok();
}

const Score = z.number().int().min(1).max(5);
const ReviewInput = z.object({
  scores: z.object({ food: Score, presentation: Score, punctuality: Score, communication: Score, value: Score }),
  comment: z.string().trim().max(3000),
  allowShowcase: z.boolean(),
});

export async function submitReview(id: string, review: z.infer<typeof ReviewInput>): Promise<ActionResult> {
  if (isDemo(id)) return ok();
  const parsed = ReviewInput.safeParse(review);
  if (!BookingId.safeParse(id).success || !parsed.success) return fail("Avaliação inválida.");
  const { scores, comment, allowShowcase } = parsed.data;
  const sb = await createClient();
  const { error } = await sb.rpc("submit_review", {
    p_booking_id: id,
    p_food: scores.food,
    p_presentation: scores.presentation,
    p_punctuality: scores.punctuality,
    p_communication: scores.communication,
    p_value: scores.value,
    p_comment: comment,
    p_photos: [],
    p_allow_showcase: allowShowcase,
    p_token: await guestToken(id),
  });
  revalidatePath(`/reserva/${id}`);
  return error ? fail("Não foi possível publicar a avaliação.") : ok();
}
