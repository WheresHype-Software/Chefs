export type ServiceType = "home" | "delivery" | "pickup" | "events" | "meal_prep";
export type FulfilmentMode = "home" | "delivery" | "pickup";
export type PriceModel = "fixed" | "per_person" | "quote";
export type ChefTier = "professional" | "home";
export type BookingStatus = "requested" | "accepted" | "change_proposed" | "declined" | "confirmed" | "completed" | "cancelled" | "expired";

// --- Money -----------------------------------------------------------------
export type PaymentMethod = "mbway" | "multibanco" | "card";
export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "expired" | "refunded" | "partially_refunded";
/** Where the signal stands on a booking. "not_required" covers every booking made before payments. */
export type DepositStatus = "not_required" | "due" | "pending" | "paid" | "overdue" | "refunded" | "partially_refunded";
export type RefundStatus = "requested" | "needs_iban" | "manual_pending" | "sent" | "done" | "failed";
export type PayoutStatus = "due" | "held" | "batched" | "paid" | "cancelled";
export type BatchStatus = "draft" | "exported" | "paid" | "cancelled";
export type LedgerKind = "deposit_in" | "commission" | "payout" | "refund" | "adjustment";

/** The amounts frozen on a booking when the chef accepts. Euros, as the database stores them. */
export type BookingMoney = {
  bookingValue: number | null;
  depositAmount: number | null;
  commissionAmount: number | null;
  payoutAmount: number | null;
  depositStatus: DepositStatus;
  depositDueAt: string | null;
  depositPaidAt: string | null;
};

export type Offer = {
  id: string;
  title: string;
  description: string | null;
  mode: FulfilmentMode;
  priceModel: PriceModel;
  price: number | null;
  unit: string;
  minGuests: number;
  maxGuests: number | null;
  leadHours: number;
  timeSlots: string[];
};

/** Shape returned by the chefs_near() database function. */
export type ChefCard = {
  id: string;
  slug: string;
  name: string;
  tier: ChefTier;
  headline: string | null;
  bio: string | null;
  area: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
  distanceKm: number | null;
  rating: number | null;
  reviewCount: number;
  responseHours: number | null;
  badges: string[];
  isNew: boolean;
  promoted: boolean;
  categories: string[];
  services: ServiceType[];
  cover: string | null;
  /** The chef's profile photo and first dish photos (added by lib/data, not by chefs_near). */
  portrait: string | null;
  dishes: string[];
  offers: Offer[];
};

export type Review = {
  id: string;
  author: string;
  date: string;
  what: string;
  comment: string | null;
  overall: number;
  reply: string | null;
};

export type ChefProfile = ChefCard & {
  languages: string[];
  socials: { instagram?: string; website?: string; tiktok?: string };
  yearsExperience: number | null;
  paymentMethods: string[];
  depositPercent: number | null;
  cancellation: { preset: string; text: string | null } | null;
  experience: { place: string; role: string | null; years: string }[];
  certifications: { title: string; issuer: string | null; verified: boolean }[];
  /** Public profile photo; initials are shown without one. */
  portrait: string | null;
  gallery: { url: string | null; caption: string }[];
  reviews: Review[];
  /** Reviews per star level, 5★ first. */
  ratingDistribution: number[];
  categoryAverages: { label: string; value: number }[];
};

export type Calendar = { available: string[]; booked: string[] };

export type ChatMessage = { id: string; sender: "client" | "chef" | "system"; body: string; at: string };

export type BookingView = {
  viewer: "client" | "chef" | "admin";
  booking: {
    id: string;
    ref: string;
    status: BookingStatus;
    offer_title: string;
    fulfilment_mode: FulfilmentMode;
    date: string;
    time_label: string | null;
    guests: number;
    address: string | null;
    notes: string | null;
    estimate: number | null;
    quoted_price: number | null;
    proposed_date: string | null;
    proposed_time: string | null;
    pickup_code: string | null;
    created_at: string;
    // Money, present once the chef has accepted and payments are on.
    booking_value: number | null;
    deposit_amount: number | null;
    commission_amount: number | null;
    payout_amount: number | null;
    deposit_status: DepositStatus;
    deposit_due_at: string | null;
    deposit_paid_at: string | null;
  };
  chef: {
    id: string;
    slug: string;
    name: string;
    /** Added by getBookingView: the Chef / Cozinheiro title and the chef's photo for the chat. */
    badges: string[];
    portrait: string | null;
    area: string | null;
    responseHours: number | null;
    paymentMethods: string[];
    depositPercent: number | null;
  };
  client: { name: string | null; email: string; phone: string | null };
  policy: { preset: string; text: string | null } | null;
  pickupAddress: string | null;
  events: { to: BookingStatus; at: string }[];
  messages: ChatMessage[];
  review: BookingReviewData | null;
};

/** What the team decides about a chef's profile. */
export type AdminDecision = "approved" | "rejected" | "suspended";

/** The review row a booking view carries (booking_view returns the whole reviews row). */
export type BookingReviewData = {
  id: string;
  overall: number;
  food: number;
  presentation: number;
  punctuality: number;
  communication: number;
  value: number;
  comment: string | null;
  chef_reply: string | null;
  created_at: string;
};
