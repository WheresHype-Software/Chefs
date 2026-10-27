// HTTP security headers, applied to every route from next.config.ts.

function origin(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

export function securityHeaders(): { key: string; value: string }[] {
  const dev = process.env.NODE_ENV !== "production";
  const supabase = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseWs = supabase?.replace(/^http/, "ws");
  const mapStyle = origin(process.env.NEXT_PUBLIC_MAP_STYLE_URL) ?? "https://tiles.openfreemap.org";
  const sources = (...items: (string | null | undefined | false)[]) => items.filter(Boolean).join(" ");

  const csp = [
    "default-src 'self'",
    // Next.js inlines its bootstrap script; 'unsafe-eval' only for dev tooling.
    `script-src ${sources("'self'", "'unsafe-inline'", dev && "'unsafe-eval'")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${sources("'self'", "data:", "blob:", supabase, mapStyle, "https://images.unsplash.com")}`,
    "font-src 'self' data:",
    `connect-src ${sources("'self'", supabase, supabaseWs, mapStyle, "https://photon.komoot.io", dev && "ws:")}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    !dev && "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
  ];
}
