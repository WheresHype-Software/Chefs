/**
 * A small in-memory rate limiter for the endpoints that are reachable without a session: the
 * payment webhook, the payment status poll, the support form.
 *
 * Deliberately modest about what it is. One process holds one counter, so behind several
 * instances the real limit is the limit times the instances. That is fine for what it defends
 * against — a script hammering one endpoint — and it is not what protects the money: nothing here
 * decides anything, every payment state is confirmed against the provider, and the database holds
 * its own limits. Put a real limiter at the edge before relying on this for anything else.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** Drops expired buckets now and then, so a long-running process does not grow a key per visitor. */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export type RateLimit = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowSeconds: number, now = Date.now()): RateLimit {
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.count > limit) return { allowed: false, remaining: 0, retryAfterSeconds };
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds };
}

/** Only for tests. */
export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = 0;
}

/** The caller's address, as far as the proxy in front of us reports it. */
export function callerIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
