"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addPhoto } from "@/app/dashboard/actions";
import type { FormMessageValue } from "@/components/ui/FormMessage";
import { createClient, hasSupabase } from "@/lib/supabase/client";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 8;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

type Kind = "selfie" | "gallery";

/**
 * Uploads chef photos straight to Supabase Storage under "<user id>/…" (storage policies only
 * allow that folder), then registers them through a server action that re-checks the path.
 */
export function usePhotoUpload(userId: string | null) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  async function upload(kind: Kind, files: FileList | null) {
    if (!files?.length || !userId || !hasSupabase) return;
    setUploading(true);
    setMessage(null);
    const storage = createClient().storage.from("chef-photos");
    let uploaded = 0;
    for (const file of Array.from(files).slice(0, MAX_FILES)) {
      if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) {
        setMessage({ ok: false, text: "Use fotografias JPG, PNG, WEBP ou HEIC até 8 MB." });
        continue;
      }
      const ext = file.type.split("/")[1];
      const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
      const { error } = await storage.upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (error) {
        setMessage({ ok: false, text: "Não foi possível carregar a fotografia." });
        continue;
      }
      const result = await addPhoto(storage.getPublicUrl(path).data.publicUrl, kind);
      if (result.ok) uploaded++;
    }
    setUploading(false);
    if (uploaded) {
      setMessage({ ok: true, text: uploaded === 1 ? "Fotografia carregada." : `${uploaded} fotografias carregadas.` });
      router.refresh();
    }
  }

  return { upload, uploading, message };
}
