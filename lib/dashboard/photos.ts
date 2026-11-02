import "server-only";
import { DEMO_PHOTOS } from "./demo";
import { chefScope } from "./session";
import type { ChefPhoto } from "./types";

/** The chef's photos: dish photos in display order (the first is the cover), then profile photo and selfie. */
export async function getMyPhotos(): Promise<ChefPhoto[]> {
  const scope = await chefScope();
  if (scope.demo) return DEMO_PHOTOS;
  const { data } = await scope.sb
    .from("chef_photos")
    .select("id, url, kind, caption")
    .eq("chef_id", scope.chef.id)
    .in("kind", ["selfie", "portrait", "gallery"])
    .order("sort_order")
    .order("id");
  return (data ?? []) as ChefPhoto[];
}
