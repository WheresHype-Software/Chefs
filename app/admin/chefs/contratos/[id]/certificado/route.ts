import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { PRINT_SCRIPT, renderAcceptanceCertificate } from "@/lib/admin/acceptance-certificate";
import { getCertificateData } from "@/lib/admin/acceptances";
import { getSession } from "@/lib/dashboard";
import { createClient, hasSupabase } from "@/lib/supabase/server";

/**
 * GET /admin/chefs/contratos/<acceptance id>/certificado — the printable certificate.
 *
 * Admins only: the role is checked here, and the reads run as the admin, so row level security is
 * a second lock. The page is our own markup with every value escaped; the policy lets it use its
 * inline stylesheet and the one script that drives the print button, identified by its hash.
 */
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCRIPT_HASH = createHash("sha256").update(PRINT_SCRIPT, "utf8").digest("base64");

export async function GET(_request: Request, { params }: RouteContext<"/admin/chefs/contratos/[id]/certificado">) {
  const { id } = await params;
  if (!hasSupabase || !UUID.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const session = await getSession();
  if (session.demo || session.role !== "admin" || !session.userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const sb = await createClient();
  const { data: admin } = await sb.from("profiles").select("name, email").eq("id", session.userId).maybeSingle();
  const issuer = [admin?.name, admin?.email].filter(Boolean).join(", ") || "administração";

  const data = await getCertificateData(id, issuer);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(renderAcceptanceCertificate(data), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${SCRIPT_HASH}'`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
