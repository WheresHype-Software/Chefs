import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { findPayment, syncPayment } from "@/lib/payments/confirm";
import { decryptWebhookData, readNotification, verifySignature } from "@/lib/payments/webhook-verify";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/payments/eupago/webhook — EuPago tells us something happened to a payment.
 *
 * The notification is treated as a nudge and nothing more. Whatever it says, and whether or not
 * its signature checks out, the next thing this does is ask EuPago directly what the state of
 * that payment is; only that answer moves anything. That is what makes a forged notification
 * worthless, and it is also why an unsigned legacy callback can still be accepted safely.
 *
 * It always answers 200 once the event is recorded. EuPago retries every two minutes three times
 * and then hourly for a day, and a retry storm caused by our own 500 helps nobody — a failure to
 * reach them is picked up by the reconciliation job instead.
 */
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function record(args: {
  paymentId: string | null;
  type: string;
  signatureValid: boolean;
  reference: string | null;
  transactionId: string | null;
  payload: Record<string, unknown>;
}): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  const { error } = await sb.rpc("record_payment_event", {
    p_payment: args.paymentId,
    p_source: "webhook",
    p_type: args.type,
    p_signature_valid: args.signatureValid,
    p_reference: args.reference,
    p_trid: args.transactionId,
    p_payload: args.payload,
  });
  if (error) console.error("[webhook] record_payment_event:", error.message);
}

async function handle(body: Record<string, unknown>, signatureValid: boolean): Promise<NextResponse> {
  const facts = readNotification(body);

  // The identifier is ours: we send the payment id when the payment is created.
  const payment =
    (facts.identifier && UUID.test(facts.identifier) ? await findPayment({ id: facts.identifier }) : null) ??
    (facts.reference ? await findPayment({ reference: facts.reference }) : null) ??
    (facts.transactionId ? await findPayment({ transactionId: facts.transactionId }) : null);

  await record({
    paymentId: payment?.id ?? null,
    type: payment ? `notification:${facts.statusWord ?? "unknown"}` : "notification:unmatched",
    signatureValid,
    reference: facts.reference,
    transactionId: facts.transactionId,
    payload: body,
  });

  // An unsigned or wrongly signed notification is still worth acting on, because acting on it
  // means asking EuPago — but the team should know the signature is not working.
  if (!signatureValid && serverEnv.eupago.webhookSecret) {
    console.warn("[webhook] signature did not verify", { reference: facts.reference });
  }

  if (payment) await syncPayment(payment, "webhook");
  return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`webhook:${callerIp(request.headers)}`, 120, 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "slow_down" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  const raw = await request.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    await record({
      paymentId: null,
      type: "notification:unreadable",
      signatureValid: false,
      reference: null,
      transactionId: null,
      payload: { raw: raw.slice(0, 1000) },
    });
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Webhooks 2.0 put the facts in `data`, either as JSON text or AES-encrypted.
  const dataField = typeof parsed.data === "string" ? parsed.data : null;
  const iv = request.headers.get("x-initialization-vector");
  let body = parsed;
  if (dataField) {
    const plain = iv ? decryptWebhookData(dataField, iv, serverEnv.eupago.webhookEncryptionKey) : dataField;
    if (plain) {
      try {
        body = { ...parsed, ...(JSON.parse(plain) as Record<string, unknown>) };
      } catch {
        // Not JSON after all; carry on with the envelope, which still carries the reference.
      }
    }
  }

  const signatureValid = verifySignature([dataField, raw], request.headers.get("x-signature"), serverEnv.eupago.webhookSecret);
  return handle(body, signatureValid);
}

/**
 * The older callback is a GET with everything in the query string and no signature at all. It is
 * accepted on the same terms as a signed one, for the same reason: it only causes a question to
 * be asked of EuPago.
 */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`webhook:${callerIp(request.headers)}`, 120, 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "slow_down" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }
  const body: Record<string, unknown> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    // Never store the API key EuPago echoes back in the legacy callback.
    if (key !== "chave_api") body[key] = value;
  });
  return handle(body, false);
}
