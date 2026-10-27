export type ServiceType = "home" | "delivery" | "pickup" | "events" | "meal_prep";
export type FulfilmentMode = "home" | "delivery" | "pickup";
export type PriceModel = "fixed" | "per_person" | "quote";
export type ChefTier = "professional" | "home";
export type BookingStatus = "requested" | "accepted" | "change_proposed" | "declined" | "confirmed" | "completed" | "cancelled" | "expired";

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
  };
  chef: {
    id: string;
    slug: string;
    name: string;
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
  review: { id: string } | null;
};
