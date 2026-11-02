"use server";

import { z } from "zod";
import { getSession, type ChefPhoto } from "@/lib/dashboard";
import { publicEnv } from "@/lib/env";
import { isSelfiePath, removeSelfies } from "@/lib/selfie";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done, NO_CHEF } from "./context";

// Profile photo and captioned dish photos (public), and the private verification selfie.
type PhotoKind = ChefPhoto["kind"];
const PHOTO_KINDS: PhotoKind[] = ["portrait", "gallery"];
const PhotoId = z.string().uuid();
const BUCKET_PATH = "/storage/v1/object/public/chef-photos/";
const CAPTION_MAX = 160;
const INVALID = "Fotografia inválida.";

/** Storage path of one of our public chef-photos URLs ("<user id>/<file>"). */
const storagePath = (url: string) => url.slice(url.indexOf(BUCKET_PATH) + BUCKET_PATH.length);

const cleanCaption = (caption: string | undefined) => caption?.trim().slice(0, CAPTION_MAX) || null;

export async function addPhoto(url: string, kind: PhotoKind, caption?: string): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  // Only accept files the chef uploaded to their own folder in our bucket.
  const session = await getSession();
  const prefix = `${publicEnv.supabaseUrl}${BUCKET_PATH}${session.userId}/`;
  if (!url.startsWith(prefix) || !PHOTO_KINDS.includes(kind)) return fail(INVALID);

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
  const { error } = await ctx.sb.from("chef_photos").insert({
    chef_id: ctx.chef.id,
    url,
    kind,
    caption: cleanCaption(caption),
    sort_order: kind === "gallery" ? nextOrder : 0,
  });
  return error ? failWith(error, "addPhoto", "Não foi possível guardar a fotografia. Tente de novo.") : done();
}

/** Registers a verification selfie uploaded to the private chef-docs bucket; it replaces any earlier one. */
export async function addSelfie(path: string): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const session = await getSession();
  if (!session.userId || !isSelfiePath(session.userId, path)) return fail(INVALID);
  const { data, error } = await ctx.sb
    .from("chef_photos")
    .insert({ chef_id: ctx.chef.id, url: path, kind: "selfie" })
    .select("id")
    .single();
  if (error) return failWith(error, "addSelfie", "Não foi possível guardar a selfie. Tente de novo.");
  await removeSelfies(ctx.sb, ctx.chef.id, data.id);
  return done();
}

export async function updatePhotoCaption(id: string, caption: string): Promise<Result> {
  if (!PhotoId.safeParse(id).success) return fail(INVALID);
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const { error } = await ctx.sb
    .from("chef_photos")
    .update({ caption: cleanCaption(caption) })
    .eq("id", id)
    .eq("chef_id", ctx.chef.id);
  return error ? failWith(error, "updatePhotoCaption", "Não foi possível guardar a descrição. Tente de novo.") : done("/dashboard/fotos");
}

export async function deletePhoto(id: string): Promise<Result> {
  if (!PhotoId.safeParse(id).success) return fail(INVALID);
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const { data, error } = await ctx.sb.from("chef_photos").delete().eq("id", id).eq("chef_id", ctx.chef.id).select("url").maybeSingle();
  if (error) return failWith(error, "deletePhoto", "Não foi possível apagar a fotografia. Tente de novo.");
  // The row is gone; a leftover file is harmless, so a storage hiccup is only logged.
  if (data) {
    const { error: storageError } = await ctx.sb.storage.from("chef-photos").remove([storagePath(data.url)]);
    if (storageError) console.error("[action] deletePhoto storage:", storageError);
  }
  return done();
}

/** Reorders dish photos: "first" makes it the cover, -1/1 moves it one place. */
export async function movePhoto(id: string, to: "first" | -1 | 1): Promise<Result> {
  if (!PhotoId.safeParse(id).success || !["first", -1, 1].includes(to)) return fail(INVALID);
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
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
  if (from < 0) return fail(INVALID);
  const target = to === "first" ? 0 : Math.min(ids.length - 1, Math.max(0, from + to));
  ids.splice(target, 0, ...ids.splice(from, 1));
  const results = await Promise.all(
    ids.map((pid, i) => ctx.sb.from("chef_photos").update({ sort_order: i }).eq("id", pid).eq("chef_id", chefId)),
  );
  const error = results.find((r) => r.error)?.error;
  return error ? failWith(error, "movePhoto", "Não foi possível mudar a ordem. Tente de novo.") : done();
}
