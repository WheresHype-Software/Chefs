"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  async function send(title: string, file: File | null): Promise<boolean> {
    setMessage(null);
    if (!title.trim()) return fail("Indique o nome do certificado.");
    if (!file) return fail("Escolha o ficheiro do certificado.");
    const ext = TYPES[file.type];
    if (!ext) return fail("Use um PDF, JPG ou PNG.");
    if (file.size > MAX_BYTES) return fail("O ficheiro tem mais de 10 MB.");
    if (!userId || !hasSupabase) {
      setMessage({ ok: true, text: "Modo de demonstração: o certificado não é guardado." });
      return true;
    }
    setSending(true);
    const path = `${userId}/cert-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("chef-docs").upload(path, file, { contentType: file.type });
    const result = error
      ? { ok: false as const, error: "Não foi possível enviar o ficheiro. Tente de novo." }
      : await callAction(() => addCertificate(title, path));
    setSending(false);
    if (!result.ok) return fail(result.error);
    setMessage({ ok: true, text: "Certificado enviado. A equipa responde por email." });
    router.refresh();
    return true;
  }

  function fail(text: string) {
    setMessage({ ok: false, text });
    return false;
  }

  return { send, sending, message };
}
