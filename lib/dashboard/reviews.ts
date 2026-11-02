import "server-only";
import { DEMO_REVIEWS } from "./demo";
import { chefScope } from "./session";
import type { DashReview } from "./types";

export async function getReviews(): Promise<DashReview[]> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_REVIEWS;
  const { data } = await scope.sb
    .from("reviews")
    .select("id, author_name, created_at, overall, comment, chef_reply, bookings(offer_title)")
    .eq("chef_id", scope.chef.id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    ...(r as unknown as DashReview),
    offer_title: (r.bookings as unknown as { offer_title: string } | null)?.offer_title ?? null,
  }));
}
