import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { CUISINES } from "./constants";
import { isoDay } from "./format";
import { PHOTOS, photoUrl } from "./photos";
import { createClient, hasSupabase } from "./supabase/server";
import type { BookingStatus, FulfilmentMode, PriceModel, ServiceType } from "./types";

export type MyChef = {
  id: string;
  slug: string;
  display_name: string;
  tier: "professional" | "home";
  headline: string | null;
  bio: string | null;
  area_name: string | null;
  service_radius_km: number;
  status: "draft" | "pending" | "approved" | "rejected" | "suspended";
  verification_notes: string | null;
  socials: { instagram?: string; website?: string; tiktok?: string };
  rating_avg: number | null;
  review_count: number;
  deposit_percent: number | null;
  years_experience: number | null;
  languages: string[];
  lat: number | null;
  lng: number | null;
};

export type DashBooking = {
  id: string;
  ref: string;
  status: BookingStatus;
  offer_title: string;
  fulfilment_mode: FulfilmentMode;
  date: string;
  time_label: string | null;
  guests: number;
  address: string | null;
  distance_km: number | null;
  notes: string | null;
  estimate: number | null;
  pickup_code: string | null;
  fulfilled_at: string | null;
  created_at: string;
  client: { name: string | null; phone: string | null; email: string } | null;
};

export type DashOffer = {
  id: string;
  title: string;
  description: string | null;
  fulfilment_mode: FulfilmentMode;
  price_model: PriceModel;
  price: number | null;
  unit_label: string;
  min_guests: number;
  max_guests: number | null;
  lead_time_hours: number;
  time_slots: string[];
  active: boolean;
};

export type Logistics = {
  home_enabled: boolean;
  travel_radius_km: number;
  free_distance_km: number;
  fee_per_km: number;
  arrival_minutes_before: number;
  delivery_enabled: boolean;
  delivery_windows: string[];
  delivery_fee: number | null;
  free_delivery_over: number | null;
  delivered_by: "chef" | "courier";
  pickup_enabled: boolean;
  kitchen_address: string | null;
};

export type Session = { demo: true; userId: null; role: "chef" } | { demo: false; userId: string; role: "client" | "chef" | "admin" };

export const getSession = cache(async (): Promise<Session> => {
  if (!hasSupabase) return { demo: true, userId: null, role: "chef" };
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  return { demo: false, userId: user.id, role: (profile?.role ?? "client") as "client" | "chef" | "admin" };
});

export const getMyChef = cache(async (): Promise<MyChef | null> => {
  const s = await getSession();
  if (s.demo) return DEMO_CHEF;
  const sb = await createClient();
  const { data } = await sb
    .from("chefs")
    .select(
      "id, slug, display_name, tier, headline, bio, area_name, service_radius_km, status, verification_notes, socials, rating_avg, review_count, deposit_percent, years_experience, languages, lat, lng",
    )
    .eq("profile_id", s.userId)
    .maybeSingle();
  return (data as unknown as MyChef) ?? null;
});

export async function requireChef(): Promise<MyChef> {
  const chef = await getMyChef();
  if (!chef) redirect("/dashboard/perfil");
  return chef;
}

const BOOKING_COLUMNS =
  "id, ref, status, offer_title, fulfilment_mode, date, time_label, guests, address, distance_km, notes, estimate, pickup_code, fulfilled_at, created_at, client:clients(name, phone, email)";

export async function getBookings(opts: { from?: string; to?: string; statuses?: BookingStatus[] } = {}): Promise<DashBooking[]> {
  const chef = await requireChef();
  if ((await getSession()).demo) {
    return demoBookings().filter(
      (b) => (!opts.from || b.date >= opts.from) && (!opts.to || b.date <= opts.to) && (!opts.statuses || opts.statuses.includes(b.status)),
    );
  }
  const sb = await createClient();
  let q = sb.from("bookings").select(BOOKING_COLUMNS).eq("chef_id", chef.id).order("date").order("time_label");
  if (opts.from) q = q.gte("date", opts.from);
  if (opts.to) q = q.lte("date", opts.to);
  if (opts.statuses) q = q.in("status", opts.statuses);
  const { data } = await q;
  return (data ?? []) as unknown as DashBooking[];
}

export async function getBooking(id: string): Promise<DashBooking | null> {
  const chef = await requireChef();
  if ((await getSession()).demo) return demoBookings().find((b) => b.id === id) ?? null;
  const sb = await createClient();
  const { data } = await sb.from("bookings").select(BOOKING_COLUMNS).eq("chef_id", chef.id).eq("id", id).maybeSingle();
  return (data as unknown as DashBooking) ?? null;
}

export async function getOffers(): Promise<DashOffer[]> {
  const chef = await requireChef();
  if ((await getSession()).demo) return DEMO_OFFERS;
  const sb = await createClient();
  const { data } = await sb
    .from("offers")
    .select(
      "id, title, description, fulfilment_mode, price_model, price, unit_label, min_guests, max_guests, lead_time_hours, time_slots, active",
    )
    .eq("chef_id", chef.id)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as DashOffer[];
}

export async function getLogistics(): Promise<{
  logistics: Logistics;
  zones: { id: string; name: string; active: boolean }[];
  slots: { id: string; label: string; active: boolean }[];
}> {
  const chef = await requireChef();
  if ((await getSession()).demo) return DEMO_LOGISTICS;
  const sb = await createClient();
  const [l, z, p] = await Promise.all([
    sb.from("chef_logistics").select("*").eq("chef_id", chef.id).maybeSingle(),
    sb.from("delivery_zones").select("id, name, active").eq("chef_id", chef.id).order("name"),
    sb.from("pickup_slots").select("id, label, active").eq("chef_id", chef.id).order("label"),
  ]);
  return {
    logistics: (l.data as Logistics) ?? {
      ...DEMO_LOGISTICS.logistics,
      kitchen_address: null,
      delivery_enabled: false,
      pickup_enabled: false,
    },
    zones: z.data ?? [],
    slots: p.data ?? [],
  };
}

export async function getAvailability(from: string, to: string): Promise<{ date: string; status: "available" | "blocked" }[]> {
  const chef = await requireChef();
  if ((await getSession()).demo) {
    const out: { date: string; status: "available" | "blocked" }[] = [];
    for (const d = new Date(from); isoDay(d) <= to; d.setDate(d.getDate() + 1)) {
      if ([4, 5, 6, 0].includes(d.getDay())) out.push({ date: isoDay(d), status: "available" });
    }
    return out;
  }
  const sb = await createClient();
  const { data } = await sb.from("availability").select("date, status").eq("chef_id", chef.id).gte("date", from).lte("date", to);
  return (data ?? []) as { date: string; status: "available" | "blocked" }[];
}

export async function getCooking(): Promise<{
  categories: { id: number; name: string }[];
  diets: { id: number; name: string }[];
  mine: { categories: number[]; diets: number[]; services: ServiceType[] };
}> {
  const chef = await requireChef();
  if ((await getSession()).demo) return DEMO_COOKING;
  const sb = await createClient();
  const [cats, diets, mc, md, ms] = await Promise.all([
    sb.from("cuisine_categories").select("id, name_pt").order("sort_order"),
    sb.from("diets").select("id, name_pt").order("id"),
    sb.from("chef_categories").select("category_id").eq("chef_id", chef.id),
    sb.from("chef_diets").select("diet_id").eq("chef_id", chef.id),
    sb.from("chef_services").select("service").eq("chef_id", chef.id),
  ]);
  return {
    categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name_pt })),
    diets: (diets.data ?? []).map((d) => ({ id: d.id, name: d.name_pt })),
    mine: {
      categories: (mc.data ?? []).map((r) => r.category_id),
      diets: (md.data ?? []).map((r) => r.diet_id),
      services: (ms.data ?? []).map((r) => r.service as ServiceType),
    },
  };
}

export type DashReview = {
  id: string;
  author_name: string;
  created_at: string;
  overall: number;
  comment: string | null;
  chef_reply: string | null;
  offer_title: string | null;
};

export type ChefPhoto = { id: string; url: string; kind: "selfie" | "portrait" | "gallery"; caption: string | null };

/** The chef's photos: dish photos in display order (the first is the cover), then profile photo and selfie. */
export async function getMyPhotos(): Promise<ChefPhoto[]> {
  const chef = await requireChef();
  if ((await getSession()).demo) return DEMO_PHOTOS;
  const sb = await createClient();
  const { data } = await sb
    .from("chef_photos")
    .select("id, url, kind, caption")
    .eq("chef_id", chef.id)
    .in("kind", ["selfie", "portrait", "gallery"])
    .order("sort_order")
    .order("id");
  return (data ?? []) as ChefPhoto[];
}

export async function getReviews(): Promise<DashReview[]> {
  const chef = await requireChef();
  if ((await getSession()).demo) return DEMO_REVIEWS;
  const sb = await createClient();
  const { data } = await sb
    .from("reviews")
    .select("id, author_name, created_at, overall, comment, chef_reply, bookings(offer_title)")
    .eq("chef_id", chef.id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    ...(r as unknown as DashReview),
    offer_title: (r.bookings as unknown as { offer_title: string } | null)?.offer_title ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Demo data (no Supabase configured): Carla Nunes, as in the dashboard mockup.
// ---------------------------------------------------------------------------
const DEMO_CHEF: MyChef = {
  id: "c-carla",
  slug: "carla-nunes",
  display_name: "Carla Nunes",
  tier: "home",
  headline: "Petiscos e eventos",
  bio: "Petiscos de Lisboa para festas em casa: pastéis de bacalhau, bifanas, salada de polvo.",
  area_name: "Alfama",
  service_radius_km: 15,
  status: "approved",
  verification_notes: null,
  socials: { instagram: "@carla.petiscos" },
  rating_avg: 4.8,
  review_count: 12,
  deposit_percent: 30,
  years_experience: 6,
  languages: ["pt", "en"],
  lat: 38.7115,
  lng: -9.13,
};

function demoBookings(): DashBooking[] {
  const base = new Date();
  const day = (n: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return isoDay(d);
  };
  const mk = (
    id: string,
    n: number,
    status: BookingStatus,
    mode: FulfilmentMode,
    time: string,
    client: string,
    what: string,
    guests: number,
    extra: Partial<DashBooking> = {},
  ): DashBooking => ({
    id,
    ref: `AL-DEMO-${id}`,
    status,
    offer_title: what,
    fulfilment_mode: mode,
    date: day(n),
    time_label: time,
    guests,
    address: mode === "pickup" ? null : "[Morada do cliente], Lisboa",
    distance_km: mode === "pickup" ? null : 2.4,
    notes: null,
    estimate: guests * 22,
    pickup_code: mode === "pickup" ? "4821" : null,
    fulfilled_at: null,
    created_at: new Date(base.getTime() - 5 * 3600_000).toISOString(),
    client: { name: client, phone: "+351 9XX XXX XXX", email: "cliente@email.pt" },
    ...extra,
  });
  return [
    mk("r1", 5, "requested", "home", "20:00", "Sofia Ramos", "Chef em casa", 6, {
      notes: "É o aniversário da minha mãe. Uma pessoa vegetariana, alergia a frutos secos.",
    }),
    mk("r2", 9, "requested", "delivery", "13:00", "Rita Gomes", "Mesa de petiscos", 20, {
      notes: "Montagem da mesa às 13:00, festa às 13:30.",
    }),
    mk("b1", 1, "confirmed", "delivery", "12:30", "Atelier Norte", "Mesa de petiscos", 12, {
      notes: "Entrar pela porta lateral. Pedem talheres descartáveis.",
      distance_km: 2.1,
    }),
    mk("b2", 3, "confirmed", "pickup", "17:30", "Joana Reis", "Caixa de petiscos", 4, {
      notes: "Pediu para separar os pastéis de bacalhau.",
      pickup_code: "3307",
    }),
    mk("b3", 4, "accepted", "home", "18:30", "Hugo e Rita", "Chef em casa", 2, {
      notes: "Jantar de aniversário de namoro. Placa a gás, sem forno.",
      distance_km: 5.6,
    }),
    mk("b4", 6, "confirmed", "pickup", "11:00", "Miguel Antunes", "Caixa de petiscos", 6, {
      notes: "Vem de bicicleta, prefere tudo em caixas fechadas.",
    }),
    mk("b5", 6, "confirmed", "delivery", "15:30", "Hugo Faria", "Mesa de petiscos", 8, {
      notes: "Deixar na portaria se não atenderem.",
      distance_km: 2.4,
    }),
    mk("b6", 6, "confirmed", "home", "18:00", "Sofia Ramos", "Chef em casa", 6, {
      notes: "Placa de indução e forno. Estacionamento EMEL na rua.",
      distance_km: 4.8,
    }),
  ];
}

const DEMO_OFFERS: DashOffer[] = [
  {
    id: "o1",
    title: "Mesa de petiscos",
    description: "Oito petiscos, entrega e montagem",
    fulfilment_mode: "delivery",
    price_model: "per_person",
    price: 22,
    unit_label: "pessoa",
    min_guests: 8,
    max_guests: 40,
    lead_time_hours: 72,
    time_slots: ["12:30", "19:00", "20:00"],
    active: true,
  },
  {
    id: "o2",
    title: "Chef em casa",
    description: "Três tempos tradicionais",
    fulfilment_mode: "home",
    price_model: "per_person",
    price: 40,
    unit_label: "pessoa",
    min_guests: 2,
    max_guests: 12,
    lead_time_hours: 48,
    time_slots: ["12:30", "19:00", "20:00"],
    active: true,
  },
  {
    id: "o3",
    title: "Caixa de petiscos",
    description: "Para levantar na cozinha",
    fulfilment_mode: "pickup",
    price_model: "per_person",
    price: 15,
    unit_label: "pessoa",
    min_guests: 2,
    max_guests: 12,
    lead_time_hours: 24,
    time_slots: ["10:30–11:30", "17:00–18:00"],
    active: true,
  },
];

const DEMO_LOGISTICS = {
  logistics: {
    home_enabled: true,
    travel_radius_km: 15,
    free_distance_km: 10,
    fee_per_km: 0.4,
    arrival_minutes_before: 120,
    delivery_enabled: true,
    delivery_windows: ["12:00–14:00", "18:00–20:00"],
    delivery_fee: 3,
    free_delivery_over: 40,
    delivered_by: "chef" as const,
    pickup_enabled: true,
    kitchen_address: "[Morada da cozinha], Alfama",
  },
  zones: ["Alfama", "Graça", "Baixa", "Arroios", "Penha de França", "Estrela", "Campo de Ourique", "Avenidas Novas"].map((name, i) => ({
    id: `z${i}`,
    name,
    active: ![5, 6].includes(i),
  })),
  slots: ["10:30–11:30", "12:00–13:00", "17:00–18:00", "19:00–20:00"].map((label, i) => ({ id: `s${i}`, label, active: i !== 3 })),
};

const DEMO_PHOTOS: ChefPhoto[] = [
  { id: "00000000-0000-4000-8000-000000000001", url: photoUrl(PHOTOS.spread), kind: "gallery", caption: "Mesa de petiscos para 20" },
  { id: "00000000-0000-4000-8000-000000000002", url: photoUrl(PHOTOS.grill), kind: "gallery", caption: "Espetadas no carvão" },
  { id: "00000000-0000-4000-8000-000000000003", url: photoUrl(PHOTOS.table), kind: "gallery", caption: null },
  { id: "00000000-0000-4000-8000-000000000004", url: photoUrl(PHOTOS.cooking), kind: "portrait", caption: null },
];

const DEMO_COOKING = {
  categories: CUISINES.map((name, i) => ({ id: i + 1, name })),
  diets: ["Vegetariano", "Vegan", "Sem glúten", "Sem lactose", "Halal", "Para crianças"].map((name, i) => ({ id: i + 1, name })),
  mine: { categories: [1, 2], diets: [1, 3, 4, 6], services: ["home", "delivery", "pickup", "events"] as ServiceType[] },
};

const DEMO_REVIEWS: DashReview[] = [
  {
    id: "rv1",
    author_name: "Inês B.",
    created_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
    overall: 5,
    comment: "Os pastéis de bacalhau desapareceram em cinco minutos. Montagem impecável.",
    chef_reply: null,
    offer_title: "Mesa de petiscos",
  },
  {
    id: "rv2",
    author_name: "Pedro C.",
    created_at: new Date(Date.now() - 20 * 86400_000).toISOString(),
    overall: 4.6,
    comment: "Muito bom e pontual. A salada de polvo é obrigatória.",
    chef_reply: "Obrigada, Pedro! Até à próxima.",
    offer_title: "Caixa de petiscos",
  },
];
