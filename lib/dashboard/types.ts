import type { BookingStatus, DepositStatus, FulfilmentMode, PriceModel, ServiceType } from "../types";

export type Role = "client" | "chef" | "admin";

/** `lumiOff`: the chef turned off Lumi, the mascot's help (auth metadata `lumi_off`). */
export type Session =
  { demo: true; userId: null; role: "chef"; lumiOff?: false } | { demo: false; userId: string; role: Role; lumiOff: boolean };

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
  /** Granted by the team only; "certified" makes the chef "Chef" instead of "Cozinheiro". */
  badges: string[];
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
  quoted_price: number | null;
  pickup_code: string | null;
  fulfilled_at: string | null;
  created_at: string;
  // Money, present once the chef has accepted and payments are on.
  booking_value: number | null;
  deposit_amount: number | null;
  commission_amount: number | null;
  payout_amount: number | null;
  deposit_status: DepositStatus;
  deposit_paid_at: string | null;
  /** The chef's own note that the client settled the rest, outside the platform. */
  rest_paid_at: string | null;
  rest_paid_amount: number | null;
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

/** Logistics settings with the chef's delivery zones and pickup slots. */
export type LogisticsSetup = {
  logistics: Logistics;
  zones: { id: string; name: string; active: boolean }[];
  slots: { id: string; label: string; active: boolean }[];
};

export type AvailabilityDay = { date: string; status: "available" | "blocked" };

/** Every cuisine category and diet, and which ones the chef picked. */
export type Cooking = {
  categories: { id: number; name: string }[];
  diets: { id: number; name: string }[];
  mine: { categories: number[]; diets: number[]; services: ServiceType[] };
};

export type SetupProgress = {
  profilePhoto: boolean;
  dishPhotos: number;
  activeOffers: number;
  /** Open days from today on. */
  openDays: number;
  /** "off" while payments are disabled, so the step is not shown at all. */
  billing: "off" | "missing" | "done";
};

export type DashReview = {
  id: string;
  booking_id: string | null;
  author_name: string;
  created_at: string;
  overall: number;
  comment: string | null;
  chef_reply: string | null;
  offer_title: string | null;
};

export type ChefPhoto = { id: string; url: string; kind: "selfie" | "portrait" | "gallery"; caption: string | null };

/** The chef's fiscal identity and bank details. The IBAN itself is never in this shape. */
export type ChefBilling = {
  entity_type: "individual" | "company";
  legal_name: string | null;
  nif: string | null;
  vat_regime: "normal" | "isento_art53";
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  birth_date: string | null;
  birth_place: string | null;
  company_reg_number: string | null;
  iban_last4: string | null;
  iban_holder: string | null;
  iban_bic: string | null;
  iban_changed_at: string | null;
  iban_approved_at: string | null;
  iban_pending_last4: string | null;
  iban_pending_expires_at: string | null;
  payout_hold_until: string | null;
  commission_percent_override: number | null;
  verified_at: string | null;
};

/** Everything that has to be true before money may leave for this chef (chef_payout_readiness). */
export type PayoutReadiness = {
  hasFiscal: boolean;
  hasDac7: boolean;
  hasIban: boolean;
  ibanApproved: boolean;
  ibanPending: boolean;
  onHold: boolean;
  holdUntil: string | null;
  agreementVersion: number | null;
  requiredAgreementVersion: number;
  blocked: boolean;
  blockedReason: string | null;
};

/** The chef's own books: what came through the app, what the clients still owe them directly. */
export type ChefMoneySummary = {
  depositsReceived: number;
  commissionPaid: number;
  restOwed: number;
  restPaid: number;
  awaitingDeposit: number;
  restToConfirm: number;
};
