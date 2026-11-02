import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** `image` when the file can be previewed inline (JPG or PNG); PDFs open in a new tab. */
export type CertificateDoc = { title: string; url: string | null; image: boolean };

/** How long an admin's link to a private certificate works. */
const LINK_SECONDS = 10 * 60;

/**
 * Short-lived links to certificates in the private chef-docs bucket (only admins and the owner
 * may read it). Certificates without a file, or whose link fails, come back with `url: null`.
 */
export async function certificateLinks(
  sb: SupabaseClient,
  certs: { title: string; document_path: string | null }[],
): Promise<CertificateDoc[]> {
  const paths = certs.map((c) => c.document_path).filter((p): p is string => Boolean(p));
  const { data } = paths.length ? await sb.storage.from("chef-docs").createSignedUrls(paths, LINK_SECONDS) : { data: [] };
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return certs.map((c) => ({
    title: c.title,
    url: (c.document_path && byPath.get(c.document_path)) || null,
    image: /\.(jpe?g|png)$/i.test(c.document_path ?? ""),
  }));
}
