import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { safeEqual } from "@/lib/crypto";
import { reconcilePending } from "@/lib/payments/confirm";

/**
 * POST /api/payments/reconcile — the catch-up job.
 *
 * Webhooks get lost: a deploy lands mid-request, a DNS hiccup eats the retries, a notification is
 * simply never sent (the older EuPago callbacks only fire for paid references, never for expired
 * ones). Every few minutes this asks about every payment still open, so the app's idea of what is
 * paid converges on the provider's with or without notifications.
 *
 * Run it from cron with the shared secret:
 *   curl -XPOST -H "x-reconcile-secret: $RECONCILE_SECRET" https://aolume.com/api/payments/reconcile
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expected = serverEnv.reconcileSecret;
  const given = request.headers.get("x-reconcile-secret") ?? "";
  if (!expected || !safeEqual(given, expected)) {
    return NextResponse.json({ error: "not_allowed" }, { status: 401 });
  }
  const result = await reconcilePending();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
