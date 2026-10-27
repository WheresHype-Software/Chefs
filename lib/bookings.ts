"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { BookingStatus, BookingView } from "@/lib/types";

function demoView(): BookingView {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  const at = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  return {
    viewer: "client",
    booking: {
      id: "demo",
      ref: "AL-DEMO",
      status: "accepted",
      offer_title: "Jantar do Minho",
      fulfilment_mode: "home",
      date: d.toISOString().slice(0, 10),
      time_label: "20:00",
      guests: 6,
      address: "Rua Ferreira Borges 112, Lisboa",
      notes: "Uma pessoa vegetariana.",
      estimate: 330,
      quoted_price: null,
      proposed_date: null,
      proposed_time: null,
      pickup_code: null,
      created_at: at(5),
    },
    chef: { id: "c-marta", slug: "marta-figueiredo", name: "Marta Figueiredo", area: "Campo de Ourique", responseHours: 3, paymentMethods: ["mbway", "transfer", "cash"], depositPercent: 30 },
    client: { name: "Sofia Ramos", email: "sofia@email.pt", phone: "+351 912 345 678" },
    policy: { preset: "moderate", text: null },
    pickupAddress: null,
    events: [
      { to: "requested", at: at(5) },
      { to: "accepted", at: at(2) },
    ],
    messages: [
      { id: "m1", sender: "system", body: "Pedido enviado · Jantar do Minho", at: at(5) },
      { id: "m2", sender: "client", body: "Olá Marta! É o jantar de aniversário da minha mãe. Temos forno e placa de indução, mas poucas travessas grandes.", at: at(5) },
      { id: "m3", sender: "chef", body: "Olá Sofia, que bom! Levo eu as travessas e a loiça de serviço. Para a pessoa vegetariana faço um arroz de cogumelos em vez do pato, pode ser?", at: at(2.1) },
      { id: "m4", sender: "system", body: "Marta aceitou o pedido", at: at(2) },
      { id: "m5", sender: "chef", body: "Para confirmar, peço um sinal de 99 € por MB WAY. Chego às 18:00 para preparar.", at: at(1.9) },
    ],
    review: null,
  };
}

export async function getBookingView(id: string, token?: string | null): Promise<BookingView | null> {
  if (!hasSupabase || id === "demo") return demoView();
  const sb = await createClient();
  const { data, error } = await sb.rpc("booking_view", { p_booking_id: id, p_token: token ?? null });
  if (error) return null;
  return data as BookingView;
}

export async function postMessage(id: string, body: string, token?: string | null): Promise<{ ok: boolean }> {
  if (!hasSupabase || id === "demo") return { ok: true };
  const sb = await createClient();
  const view = await getBookingView(id, token);
  if (!view) return { ok: false };
  if (view.viewer === "chef") {
    const { data: conv } = await sb
      .from("conversations")
      .select("id")
      .eq("chef_id", view.chef.id)
      .eq("client_id", (await sb.from("bookings").select("client_id").eq("id", id).single()).data?.client_id ?? "")
      .single();
    if (!conv) return { ok: false };
    const { error } = await sb.from("messages").insert({ conversation_id: conv.id, sender: "chef", body: body.slice(0, 4000) });
    return { ok: !error };
  }
  const { error } = await sb.rpc("client_post_message", { p_booking_id: id, p_body: body, p_token: token ?? null });
  return { ok: !error };
}

export async function clientAction(id: string, action: "cancel" | "accept_proposal", token?: string | null) {
  if (!hasSupabase || id === "demo") return { ok: true };
  const sb = await createClient();
  const { error } = await sb.rpc("client_update_booking", { p_booking_id: id, p_action: action, p_token: token ?? null });
  revalidatePath(`/reserva/${id}`);
  return { ok: !error, error: error?.message };
}

export type ChefUpdate = {
  status: BookingStatus;
  decline_reason?: string;
  proposed_date?: string;
  proposed_time?: string;
  quoted_price?: number;
};

export async function chefUpdateBooking(id: string, update: ChefUpdate) {
  if (!hasSupabase) return { ok: true };
  const sb = await createClient();
  // Server actions accept any JSON: only pass the workflow fields a chef may set.
  const allowed: ChefUpdate = { status: update.status };
  if (update.decline_reason) allowed.decline_reason = String(update.decline_reason).slice(0, 500);
  if (update.proposed_date && /^\d{4}-\d{2}-\d{2}$/.test(update.proposed_date)) allowed.proposed_date = update.proposed_date;
  if (update.proposed_time) allowed.proposed_time = String(update.proposed_time).slice(0, 40);
  if (update.quoted_price != null && Number.isFinite(Number(update.quoted_price))) allowed.quoted_price = Number(update.quoted_price);
  const { error } = await sb.from("bookings").update(allowed).eq("id", id);
  revalidatePath("/dashboard", "layout");
  return { ok: !error, error: error?.message };
}

export async function submitReview(
  id: string,
  scores: { food: number; presentation: number; punctuality: number; communication: number; value: number },
  comment: string,
  allowShowcase: boolean,
  token?: string | null,
) {
  if (!hasSupabase || id === "demo") return { ok: true };
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
    p_token: token ?? null,
  });
  revalidatePath(`/reserva/${id}`);
  return { ok: !error, error: error?.message };
}
