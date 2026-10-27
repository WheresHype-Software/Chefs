import "server-only";
import { cache } from "react";
import { MOCK_CHEFS, mockCalendar, mockProfile } from "./mock";
import { createAnonClient, hasSupabase } from "./supabase/server";
import type { Calendar, ChefCard, ChefProfile } from "./types";

export const getChefs = cache(async (lat?: number, lng?: number): Promise<ChefCard[]> => {
  if (!hasSupabase) return MOCK_CHEFS;
  const { data, error } = await createAnonClient().rpc("chefs_near", {
    p_lat: lat ?? null,
    p_lng: lng ?? null,
  });
  if (error) throw new Error(`chefs_near: ${error.message}`);
  return (data ?? []) as ChefCard[];
});

export async function getCalendar(chefId: string, from: Date, to: Date): Promise<Calendar> {
  if (!hasSupabase) return mockCalendar(chefId, from, to);
  const { data, error } = await createAnonClient().rpc("chef_calendar", {
    p_chef_id: chefId,
    p_from: from.toISOString().slice(0, 10),
    p_to: to.toISOString().slice(0, 10),
  });
  if (error) throw new Error(`chef_calendar: ${error.message}`);
  return (data ?? { available: [], booked: [] }) as Calendar;
}

type ReviewRow = {
  id: string;
  author_name: string;
  created_at: string;
  comment: string | null;
  overall: number;
  chef_reply: string | null;
  food: number;
  presentation: number;
  punctuality: number;
  communication: number;
  value: number;
  bookings: { offer_title: string; guests: number } | null;
};

export const getChefProfile = cache(async (slug: string): Promise<ChefProfile | null> => {
  if (!hasSupabase) return mockProfile(slug);
  const sb = createAnonClient();
  const card = (await getChefs()).find((c) => c.slug === slug);
  if (!card) return null;

  const [chef, exp, certs, photos, policy, reviews] = await Promise.all([
    sb.from("chefs").select("languages, socials, years_experience, payment_methods, deposit_percent").eq("id", card.id).single(),
    sb.from("chef_experience").select("place, role, start_year, end_year").eq("chef_id", card.id).order("start_year"),
    sb.from("chef_certifications").select("title, issuer, verified").eq("chef_id", card.id),
    sb.from("chef_photos").select("url, caption, kind").eq("chef_id", card.id).eq("kind", "gallery").order("sort_order"),
    sb.from("cancellation_policies").select("preset, custom_text").eq("chef_id", card.id).maybeSingle(),
    sb
      .from("reviews")
      .select(
        "id, author_name, created_at, comment, overall, chef_reply, food, presentation, punctuality, communication, value, bookings(offer_title, guests)",
      )
      .eq("chef_id", card.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const rv = (reviews.data ?? []) as unknown as ReviewRow[];
  const avg = (k: keyof ReviewRow) => (rv.length ? rv.reduce((a, r) => a + Number(r[k]), 0) / rv.length : 0);

  return {
    ...card,
    languages: chef.data?.languages ?? [],
    socials: chef.data?.socials ?? {},
    yearsExperience: chef.data?.years_experience ?? null,
    paymentMethods: (chef.data?.payment_methods ?? []).map((m: string) => PAYMENT_LABEL[m] ?? m),
    depositPercent: chef.data?.deposit_percent ?? null,
    cancellation: policy.data ? { preset: policy.data.preset, text: policy.data.custom_text } : null,
    experience: (exp.data ?? []).map((e) => ({
      place: e.place,
      role: e.role,
      years: `${e.start_year ?? ""}–${e.end_year ?? "hoje"}`,
    })),
    certifications: certs.data ?? [],
    gallery: (photos.data ?? []).map((p) => ({ url: p.url, caption: p.caption ?? "" })),
    reviews: rv.map((r) => ({
      id: r.id,
      author: r.author_name,
      date: r.created_at,
      what: r.bookings ? `${r.bookings.offer_title} · ${r.bookings.guests} pessoas` : "",
      comment: r.comment,
      overall: Number(r.overall),
      reply: r.chef_reply,
    })),
    categoryAverages: rv.length
      ? [
          { label: "Comida", value: avg("food") },
          { label: "Apresentação", value: avg("presentation") },
          { label: "Pontualidade", value: avg("punctuality") },
          { label: "Comunicação", value: avg("communication") },
          { label: "Qualidade/preço", value: avg("value") },
        ]
      : [],
  };
});

export const PAYMENT_LABEL: Record<string, string> = {
  mbway: "MB WAY",
  transfer: "Transferência",
  cash: "Dinheiro",
};

export const CANCELLATION_LABEL: Record<string, string> = {
  flexible: "Flexível: grátis até 24 h antes",
  moderate: "Moderado: grátis até 5 dias antes",
  strict: "Rígido: sinal não reembolsável",
  custom: "Política do chef",
};
