import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// The verification selfie lives in the private chef-docs bucket as "<user id>/selfie-<uuid>.jpg";
// only the chef and the team can open it. Older accounts kept a public URL in chef-photos.

const SIGNED_SECONDS = 10 * 60;
const PUBLIC_PREFIX = "/storage/v1/object/public/chef-photos/";

export const isSelfiePath = (userId: string, path: string) =>
  path.startsWith(`${userId}/`) && /^[^/]+\/selfie-[0-9a-f-]{36}\.(jpg|png)$/.test(path);

/** A short-lived link to view a selfie (legacy public URLs pass through). */
export async function selfieLink(sb: SupabaseClient, url: string): Promise<string | null> {
  if (url.startsWith("http")) return url;
  const { data } = await sb.storage.from("chef-docs").createSignedUrl(url, SIGNED_SECONDS);
  return data?.signedUrl ?? null;
}

/**
 * Deletes a chef's selfie rows and files, except `keepId`. Files go through the secret-key
 * client, since chef-docs has no delete policy; without one only the rows go and the files stay private.
 */
export async function removeSelfies(sb: SupabaseClient, chefId: string, keepId?: string): Promise<void> {
  // The team removes another chef's rows, which RLS may not allow the signed-in admin to do.
  const admin = createAdminClient();
  const db = admin ?? sb;
  const { data } = await db.from("chef_photos").select("id, url").eq("chef_id", chefId).eq("kind", "selfie");
  const old = (data ?? []).filter((r) => r.id !== keepId);
  if (!old.length) return;
  await db
    .from("chef_photos")
    .delete()
    .in(
      "id",
      old.map((r) => r.id),
    );
  if (!admin) return;
  const docs = old.filter((r) => !r.url.startsWith("http")).map((r) => r.url);
  const legacy = old
    .filter((r) => r.url.includes(PUBLIC_PREFIX))
    .map((r) => r.url.slice(r.url.indexOf(PUBLIC_PREFIX) + PUBLIC_PREFIX.length));
  const results = await Promise.all([
    docs.length ? admin.storage.from("chef-docs").remove(docs) : null,
    legacy.length ? admin.storage.from("chef-photos").remove(legacy) : null,
  ]);
  for (const r of results) if (r?.error) console.error("[selfie] remove:", r.error);
}
