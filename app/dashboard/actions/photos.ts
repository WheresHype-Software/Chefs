"use server";

import { z } from "zod";
import { getSession, type ChefPhoto } from "@/lib/dashboard";
import { publicEnv } from "@/lib/env";
import { isSelfiePath, removeSelfies } from "@/lib/selfie";
import { requestTranslator } from "@/lib/i18n/server";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done } from "./context";

// Profile photo and captioned dish photos (public), and the private verification selfie.
type PhotoKind = ChefPhoto["kind"];
const PHOTO_KINDS: PhotoKind[] = ["portrait", "gallery"];
const PhotoId = z.string().uuid();
const BUCKET_PATH = "/storage/v1/object/public/chef-photos/";
const CAPTION_MAX = 160;

/** Storage path of one of our public chef-photos URLs ("<user id>/<file>"). */
const storagePath = (url: string) => url.slice(url.indexOf(BUCKET_PATH) + BUCKET_PATH.length);

const cleanCaption = (caption: string | undefined) => caption?.trim().slice(0, CAPTION_MAX) || null;

/** The saved row comes back, so the gallery can show the photo without waiting for a refresh. */
export type AddPhotoResult = { ok: true; photo: ChefPhoto | null } | { ok: false; error: string };

export async function addPhoto(url: string, kind: PhotoKind, caption?: string): Promise<AddPhotoResult> {
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return { ok: true, photo: null };
  // Spelled out rather than fail(): the richer return type cannot be narrowed from ActionResult.
  if (!ctx.chef) return { ok: false, error: t("dashboard.noChef") };
  // Only accept files the chef uploaded to their own folder in our bucket.
  const session = await getSession();
  const prefix = `${publicEnv.supabaseUrl}${BUCKET_PATH}${session.userId}/`;
  if (!url.startsWith(prefix) || !PHOTO_KINDS.includes(kind)) return { ok: false, error: t("dashboard.photos.invalid") };

  const { data: existing } = await ctx.sb.from("chef_photos").select("id, url, kind, sort_order").eq("chef_id", ctx.chef.id);
  const rows = existing ?? [];
  // One profile photo: a new upload replaces the old file.
  if (kind === "portrait") {
    const old = rows.filter((r) => r.kind === kind);
    if (old.length) {
      await ctx.sb
        .from("chef_photos")
        .delete()
        .in(
          "id",
          old.map((r) => r.id),
        );
      await ctx.sb.storage.from("chef-photos").remove(old.map((r) => storagePath(r.url)));
    }
  }
  const nextOrder = Math.max(-1, ...rows.filter((r) => r.kind === "gallery").map((r) => r.sort_order)) + 1;
  const { data: saved, error } = await ctx.sb
    .from("chef_photos")
    .insert({
      chef_id: ctx.chef.id,
      url,
      kind,
      caption: cleanCaption(caption),
      sort_order: kind === "gallery" ? nextOrder : 0,
    })
    .select("id, url, kind, caption, sort_order")
    .single();
  if (error) {
    const failure = failWith(error, "addPhoto", t("dashboard.photos.saveFailed"));
    return failure.ok ? { ok: true, photo: null } : failure;
  }
  done();
  return { ok: true, photo: saved as unknown as ChefPhoto };
}

/** Registers a verification selfie uploaded to the private chef-docs bucket; it replaces any earlier one. */
export async function addSelfie(path: string): Promise<Result> {
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const session = await getSession();
  if (!session.userId || !isSelfiePath(session.userId, path)) return fail(t("dashboard.photos.invalid"));
  const { data, error } = await ctx.sb
    .from("chef_photos")
    .insert({ chef_id: ctx.chef.id, url: path, kind: "selfie" })
    .select("id")
    .single();
  if (error) return failWith(error, "addSelfie", t("dashboard.photos.selfieFailed"));
  await removeSelfies(ctx.sb, ctx.chef.id, data.id);
  return done();
}

export async function updatePhotoCaption(id: string, caption: string): Promise<Result> {
  const t = await requestTranslator("errors");
  if (!PhotoId.safeParse(id).success) return fail(t("dashboard.photos.invalid"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const { error } = await ctx.sb
    .from("chef_photos")
    .update({ caption: cleanCaption(caption) })
    .eq("id", id)
    .eq("chef_id", ctx.chef.id);
  return error ? failWith(error, "updatePhotoCaption", t("dashboard.photos.captionFailed")) : done("/dashboard");
}

export async function deletePhoto(id: string): Promise<Result> {
  const t = await requestTranslator("errors");
  if (!PhotoId.safeParse(id).success) return fail(t("dashboard.photos.invalid"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const { data, error } = await ctx.sb.from("chef_photos").delete().eq("id", id).eq("chef_id", ctx.chef.id).select("url").maybeSingle();
  if (error) return failWith(error, "deletePhoto", t("dashboard.photos.deleteFailed"));
  // The row is gone; a leftover file is harmless, so a storage hiccup is only logged.
  if (data) {
    const { error: storageError } = await ctx.sb.storage.from("chef-photos").remove([storagePath(data.url)]);
    if (storageError) console.error("[action] deletePhoto storage:", storageError);
  }
  return done();
}

/** Reorders dish photos: "first" makes it the cover, -1/1 moves it one place. */
export async function movePhoto(id: string, to: "first" | -1 | 1): Promise<Result> {
  const t = await requestTranslator("errors");
  if (!PhotoId.safeParse(id).success || !["first", -1, 1].includes(to)) return fail(t("dashboard.photos.invalid"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const chefId = ctx.chef.id;
  const { data } = await ctx.sb
    .from("chef_photos")
    .select("id")
    .eq("chef_id", chefId)
    .eq("kind", "gallery")
    .order("sort_order")
    .order("id");
  const ids = (data ?? []).map((r) => r.id);
  const from = ids.indexOf(id);
  if (from < 0) return fail(t("dashboard.photos.invalid"));
  const target = to === "first" ? 0 : Math.min(ids.length - 1, Math.max(0, from + to));
  ids.splice(target, 0, ...ids.splice(from, 1));
  const results = await Promise.all(
    ids.map((pid, i) => ctx.sb.from("chef_photos").update({ sort_order: i }).eq("id", pid).eq("chef_id", chefId)),
  );
  const error = results.find((r) => r.error)?.error;
  return error ? failWith(error, "movePhoto", t("dashboard.photos.moveFailed")) : done();
}
