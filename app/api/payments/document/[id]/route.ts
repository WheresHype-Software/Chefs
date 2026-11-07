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
 *
 * The file always comes back through here, never by redirect to the signed link. Supabase storage
 * refuses to serve HTML as HTML — it rewrites the type to `text/plain` and adds a sandbox policy,
 * so that nobody can host a page on the project's own domain. Sensible for them, useless for us:
 * the chef opened a document and got the markup, with the accents broken on top, because
 * `text/plain` carries no charset and `<meta charset>` is only read inside HTML.
 *
 * So we serve it ourselves, where the type and the encoding are ours to set. The markup is our own
 * and every value in it is escaped (see renderPayoutDocument), and the policy below allows it
 * nothing beyond its own inline stylesheet.
 *
 * With `?download=1` it arrives as an attachment with a filename instead of opening in a tab.
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
  const path = data.document_path as string;

  const { data: file } = await admin.storage.from("payout-docs").download(path);
  if (!file) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const name = `${(data.number as string | null) ?? "documento"}.html`;
  const asAttachment = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${name}"`,
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Cache-Control": "no-store",
    },
  });
}
