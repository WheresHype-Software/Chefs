"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addPhoto, addSelfie } from "@/app/dashboard/actions/photos";
import type { FormMessageValue } from "@/components/ui/FormMessage";
import { prepareImage } from "@/lib/image";
import { createClient, hasSupabase } from "@/lib/supabase/client";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 12;

export type UploadKind = "selfie" | "portrait" | "gallery";

/**
 * Uploads chef photos straight to Supabase Storage under "<user id>/…" (storage policies only
 * allow that folder), then registers them through a server action that re-checks the path.
 * Photos are resized and stripped of metadata in the browser first (lib/image).
 */
export function usePhotoUpload(userId: string | null) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
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
    let uploaded = 0;
    let failed = 0;
    for (const file of picked) {
      try {
        if (file.size > MAX_SOURCE_BYTES) throw new Error("too big");
        const blob = await prepareImage(file);
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        if (selfie && ext === "webp") throw new Error("type");
        const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
        const { error } = await storage.upload(path, blob, { cacheControl: "31536000", contentType: blob.type || "image/jpeg" });
        if (error) throw error;
        const result = selfie ? await addSelfie(path) : await addPhoto(storage.getPublicUrl(path).data.publicUrl, kind);
        if (!result.ok) throw new Error(result.error);
        uploaded++;
      } catch {
        failed++;
      }
    }
    setUploading(false);
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
    if (uploaded) router.refresh();
  }

  return { upload, uploading, message };
}
