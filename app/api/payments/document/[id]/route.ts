import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, hasSupabase } from "@/lib/supabase/server";

/**
 * GET /api/payments/document/<id> — opens a payment document.
 *
 * Two locks. The first is row level security: the lookup runs as the signed-in person, so the row
 * only comes back for the chef it belongs to or for an admin. The second is the bucket, which is
 * private and only ever reached through a link that expires in a minute. A document id on its own
 * opens nothing.
 */
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: RouteContext<"/api/payments/document/[id]">) {
  const { id } = await params;
  if (!hasSupabase || !UUID.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const sb = await createClient();
  const { data } = await sb.from("payout_documents").select("document_path, number").eq("id", id).maybeSingle();
  if (!data?.document_path) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: signed } = await admin.storage.from("payout-docs").createSignedUrl(data.document_path as string, 60);
  if (!signed?.signedUrl) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
