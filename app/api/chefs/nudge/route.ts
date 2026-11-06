import { NextResponse, type NextRequest } from "next/server";
import { nudgeStalledChefs } from "@/lib/chef-nudges";
import { safeEqual } from "@/lib/crypto";
import { serverEnv } from "@/lib/env.server";

/**
 * POST /api/chefs/nudge — one reminder to each chef who stopped halfway.
 *
 * Nothing is sent until this is scheduled, so adding it changes no behaviour on its own:
 *   curl -XPOST -H "x-reconcile-secret: $RECONCILE_SECRET" https://aolume.com/api/chefs/nudge
 * Once a day is plenty; the database makes sure nobody is told twice about the same step.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expected = serverEnv.reconcileSecret;
  const given = request.headers.get("x-reconcile-secret") ?? "";
  if (!expected || !safeEqual(given, expected)) {
    return NextResponse.json({ error: "not_allowed" }, { status: 401 });
  }
  const result = await nudgeStalledChefs();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
