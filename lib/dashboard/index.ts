// The chef dashboard's data: the signed-in chef's own rows, or demo data without Supabase.
import "server-only";

export { getSession, getMyChef, requireChef } from "./session";
export { getBookings, getBooking } from "./bookings";
export { getOffers } from "./offers";
export { getLogistics } from "./logistics";
export { getAvailability } from "./availability";
export { getCooking } from "./cooking";
export { getMyPhotos } from "./photos";
export { getMyCertificates, type MyCertificate } from "./certificates";
export { getReviews } from "./reviews";
export { getSetupProgress } from "./setup";
export { getBilling, type BillingView } from "./billing";
export { getPayouts, type PayoutsView, type PayoutRow, type PayoutDocumentRow, type PayoutSummary } from "./payouts";
export type {
  Role,
  Session,
  MyChef,
  DashBooking,
  DashOffer,
  Logistics,
  LogisticsSetup,
  AvailabilityDay,
  Cooking,
  SetupProgress,
  DashReview,
  ChefPhoto,
  ChefBilling,
  PayoutReadiness,
} from "./types";
