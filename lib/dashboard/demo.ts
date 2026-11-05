// Demo data (no Supabase configured): Carla Nunes, as in the dashboard mockup.
import { CUISINES, DIETS } from "../constants";
import { isoDay } from "../format";
import { PHOTOS, photoUrl } from "../photos";
import type { BookingStatus, FulfilmentMode } from "../types";
import type {
  AvailabilityDay,
  ChefPhoto,
  Cooking,
  DashBooking,
  DashOffer,
  DashReview,
  LogisticsSetup,
  MyChef,
  SetupProgress,
} from "./types";

export const DEMO_CHEF: MyChef = {
  id: "c-carla",
  slug: "carla-nunes",
  display_name: "Carla Nunes",
  tier: "home",
  badges: ["identity", "portfolio", "cozinheira"],
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

export function demoBookings(): DashBooking[] {
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
    quoted_price: null,
    booking_value: null,
    deposit_amount: null,
    commission_amount: null,
    payout_amount: null,
    deposit_status: "not_required" as const,
    deposit_paid_at: null,
    rest_paid_at: null,
    rest_paid_amount: null,
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
      quoted_price: null,
      booking_value: null,
      deposit_amount: null,
      commission_amount: null,
      payout_amount: null,
      deposit_status: "not_required" as const,
      deposit_paid_at: null,
      rest_paid_at: null,
      rest_paid_amount: null,
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

export const DEMO_OFFERS: DashOffer[] = [
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

export const DEMO_LOGISTICS: LogisticsSetup = {
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
    delivered_by: "chef",
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

export const DEMO_PHOTOS: ChefPhoto[] = [
  { id: "00000000-0000-4000-8000-000000000001", url: photoUrl(PHOTOS.spread), kind: "gallery", caption: "Mesa de petiscos para 20" },
  { id: "00000000-0000-4000-8000-000000000002", url: photoUrl(PHOTOS.grill), kind: "gallery", caption: "Espetadas no carvão" },
  { id: "00000000-0000-4000-8000-000000000003", url: photoUrl(PHOTOS.table), kind: "gallery", caption: null },
  { id: "00000000-0000-4000-8000-000000000004", url: photoUrl(PHOTOS.cooking), kind: "portrait", caption: null },
];

export const DEMO_COOKING: Cooking = {
  categories: CUISINES.map((name, i) => ({ id: i + 1, name })),
  diets: DIETS.map((name, i) => ({ id: i + 1, name })),
  mine: { categories: [1, 2], diets: [1, 3, 4, 6], services: ["home", "delivery", "pickup", "events"] },
};

export const DEMO_REVIEWS: DashReview[] = [
  {
    id: "rv1",
    booking_id: null,
    author_name: "Inês B.",
    created_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
    overall: 5,
    comment: "Os pastéis de bacalhau desapareceram em cinco minutos. Montagem impecável.",
    chef_reply: null,
    offer_title: "Mesa de petiscos",
  },
  {
    id: "rv2",
    booking_id: null,
    author_name: "Pedro C.",
    created_at: new Date(Date.now() - 20 * 86400_000).toISOString(),
    overall: 4.6,
    comment: "Muito bom e pontual. A salada de polvo é obrigatória.",
    chef_reply: "Obrigada, Pedro! Até à próxima.",
    offer_title: "Caixa de petiscos",
  },
];

export const DEMO_SETUP: SetupProgress = { profilePhoto: true, dishPhotos: 3, activeOffers: 3, openDays: 12, billing: "missing" };

/** Thursdays to Sundays open. */
export function demoAvailability(from: string, to: string): AvailabilityDay[] {
  const out: AvailabilityDay[] = [];
  for (const d = new Date(from); isoDay(d) <= to; d.setDate(d.getDate() + 1)) {
    if ([4, 5, 6, 0].includes(d.getDay())) out.push({ date: isoDay(d), status: "available" });
  }
  return out;
}
