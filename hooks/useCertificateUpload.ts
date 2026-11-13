"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useState } from "react";
import { addCertificate } from "@/app/dashboard/actions/certificates";
import type { FormMessageValue } from "@/components/ui/FormMessage";
import { callAction } from "@/lib/call-action";
import { createClient, hasSupabase } from "@/lib/supabase/client";

// The chef-docs bucket accepts these, up to 10 MB (migration 20261027000005).
const TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Sends a certificate: the file goes straight to the private chef-docs bucket under
 * "<user id>/" (only the chef and the team can open it), then a server action registers it.
 */
export function useCertificateUpload(userId: string | null) {
  const t = useTranslations("dashboard.title.upload");
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  async function send(title: string, file: File | null): Promise<boolean> {
    setMessage(null);
    if (!title.trim()) return fail(t("needName"));
    if (!file) return fail(t("needFile"));
    const ext = TYPES[file.type];
    if (!ext) return fail(t("fileType"));
    if (file.size > MAX_BYTES) return fail(t("tooBig"));
    if (!userId || !hasSupabase) {
      setMessage({ ok: true, text: t("demo") });
      return true;
    }
    setSending(true);
    const path = `${userId}/cert-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("chef-docs").upload(path, file, { contentType: file.type });
    const result = error ? { ok: false as const, error: t("failed") } : await callAction(() => addCertificate(title, path));
    setSending(false);
    if (!result.ok) return fail(result.error);
    setMessage({ ok: true, text: t("sent") });
    router.refresh();
    return true;
  }

  function fail(text: string) {
    setMessage({ ok: false, text });
    return false;
  }

  return { send, sending, message };
}
