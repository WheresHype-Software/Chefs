"use client";

import { useRouter } from "@/lib/i18n/navigation";
import { useState } from "react";
import { addPhoto, addSelfie } from "@/app/dashboard/actions/photos";
import type { FormMessageValue } from "@/components/ui/FormMessage";
import type { ChefPhoto } from "@/lib/dashboard";
import { prepareImage } from "@/lib/image";
import { createClient, hasSupabase } from "@/lib/supabase/client";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 12;
/** Phones do not thank you for four big resizes and uploads at once. */
const AT_A_TIME = 3;

export type UploadKind = "selfie" | "portrait" | "gallery";

/** Runs the jobs with at most `limit` in flight, keeping the results in the original order. */
async function inParallel<T>(jobs: (() => Promise<T>)[], limit: number, onDone: () => void): Promise<T[]> {
  const results = new Array<T>(jobs.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= jobs.length) return;
      results[i] = await jobs[i]!();
      onDone();
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Uploads chef photos straight to Supabase Storage under "<user id>/…" (storage policies only
 * allow that folder), then registers them through a server action that re-checks the path.
 * Photos are resized and stripped of metadata in the browser first (lib/image).
 *
 * The slow half — resizing and uploading — runs a few at a time instead of one after another,
 * and each photo is handed to `onUploaded` the moment it is saved, so the gallery fills in as
 * they land rather than all at once at the end. Registering stays in order, so the gallery ends
 * up in the order the files were picked.
 */
export function usePhotoUpload(userId: string | null, onUploaded?: (photo: ChefPhoto) => void) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  async function upload(kind: UploadKind, files: FileList | null) {
    if (!files?.length) return;
    if (!userId || !hasSupabase) {
      setMessage({ ok: true, text: "Modo de demonstração: as fotografias não são guardadas." });
      return;
    }
    setUploading(true);
    setMessage(null);
    // The selfie goes to the private bucket (JPG or PNG only); everything else is public.
    const selfie = kind === "selfie";
    const storage = createClient().storage.from(selfie ? "chef-docs" : "chef-photos");
    const picked = Array.from(files).slice(0, kind === "gallery" ? MAX_FILES : 1);
    setProgress({ done: 0, total: picked.length });

    let done = 0;
    const prepared = await inParallel(
      picked.map((file) => async (): Promise<string | null> => {
        try {
          if (file.size > MAX_SOURCE_BYTES) throw new Error("too big");
          const blob = await prepareImage(file);
          const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
          if (selfie && ext === "webp") throw new Error("type");
          const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
          const { error } = await storage.upload(path, blob, { cacheControl: "31536000", contentType: blob.type || "image/jpeg" });
          if (error) throw error;
          return path;
        } catch {
          return null;
        }
      }),
      AT_A_TIME,
      () => {
        done += 1;
        setProgress({ done, total: picked.length });
      },
    );

    // Registering is quick and has to stay in order: sort_order is read then written, so two at
    // once would fight over the same number and the gallery would come out shuffled.
    let uploaded = 0;
    let failed = picked.length - prepared.filter(Boolean).length;
    for (const path of prepared) {
      if (!path) continue;
      try {
        if (selfie) {
          const result = await addSelfie(path);
          if (!result.ok) throw new Error(result.error);
        } else {
          const result = await addPhoto(storage.getPublicUrl(path).data.publicUrl, kind);
          if (!result.ok) throw new Error(result.error);
          if (result.photo) onUploaded?.(result.photo);
        }
        uploaded += 1;
      } catch {
        failed += 1;
      }
    }

    setUploading(false);
    setProgress(null);
    if (failed) {
      setMessage({
        ok: false,
        text: selfie
          ? "A selfie não foi carregada. Use uma fotografia JPG ou PNG, ou tire-a com a câmara."
          : `${failed === 1 ? "Uma fotografia não foi carregada" : `${failed} fotografias não foram carregadas`}. Use JPG, PNG ou WEBP.`,
      });
    } else if (uploaded) {
      setMessage({
        ok: true,
        text: selfie
          ? "Selfie enviada. Só a equipa a vê."
          : uploaded === 1
            ? "Fotografia carregada."
            : `${uploaded} fotografias carregadas.`,
      });
    }
    // The gallery is already showing them; this only reconciles the server's copy.
    if (uploaded) router.refresh();
  }

  return { upload, uploading, progress, message };
}
