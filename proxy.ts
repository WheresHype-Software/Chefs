import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { bookingTokenCookieName, bookingTokenCookieOptions, TOKEN_RE, UUID_RE } from "@/lib/booking-token";
import { hasSupabase, supabaseConfig } from "@/lib/env";
import { localizePath, routing, splitLocale } from "@/lib/i18n/routing";

const intl = createIntlMiddleware(routing);

const PROTECTED = ["/dashboard", "/admin", "/conta"];

/**
 * Magic links arrive as /reserva/<id>?t=<token> (or /en/reserva/<id>?t=<token>). Move the token into an httpOnly cookie scoped to
 * that booking and redirect to the clean URL, so it never stays in the address bar or history.
 */
function captureBookingToken(request: NextRequest): NextResponse | null {
  const match = splitLocale(request.nextUrl.pathname).path.match(/^\/reserva\/([^/]+)$/);
  const token = request.nextUrl.searchParams.get("t");
  if (!match || token === null) return null;

  const clean = request.nextUrl.clone();
  clean.searchParams.delete("t");
  const response = NextResponse.redirect(clean);
  const id = match[1]!;
  if (UUID_RE.test(id) && TOKEN_RE.test(token)) {
    response.cookies.set(bookingTokenCookieName(id), token, bookingTokenCookieOptions(id));
  }
  return response;
}

/**
 * Refreshes the Supabase session cookie and keeps signed-out users out of the dashboard, admin
 * and client area. `base` is the response so far (the locale rewrite for pages); the refreshed
 * cookies are written onto it. Without one, the request simply continues.
 */
async function refreshSession(request: NextRequest, base?: NextResponse): Promise<NextResponse> {
  const { url, key } = supabaseConfig();
  let response = base ?? NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        if (!base) response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { locale, path } = splitLocale(request.nextUrl.pathname);
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const to = request.nextUrl.clone();
    to.pathname = localizePath("/entrar", locale);
    to.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(to);
  }
  return response;
}

/** Pages go through the locale routing; API routes, the auth callback and files do not. */
function isPage(pathname: string): boolean {
  return !pathname.startsWith("/api/") && !pathname.startsWith("/auth/") && !/\.[a-z0-9]+$/i.test(pathname);
}

export async function proxy(request: NextRequest) {
  // Payment callbacks arrive from EuPago with no cookies and must not wait on a session refresh.
  if (request.nextUrl.pathname.startsWith("/api/payments/")) return NextResponse.next();

  const tokenRedirect = captureBookingToken(request);
  if (tokenRedirect) return tokenRedirect;

  if (!isPage(request.nextUrl.pathname)) return hasSupabase ? refreshSession(request) : NextResponse.next();

  // /en/... → [locale]=en; anything else → [locale]=pt (and /pt/... redirects to the bare path).
  const localized = intl(request);
  if (localized.headers.has("location")) return localized;
  if (!hasSupabase) return localized; // demo mode
  return refreshSession(request, localized);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|vendor/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
