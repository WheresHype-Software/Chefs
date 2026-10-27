import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { bookingTokenCookieName, bookingTokenCookieOptions, TOKEN_RE, UUID_RE } from "@/lib/booking-token";
import { hasSupabase, supabaseConfig } from "@/lib/env";

const PROTECTED = ["/dashboard", "/admin"];

/**
 * Magic links arrive as /reserva/<id>?t=<token>. Move the token into an httpOnly cookie scoped to
 * that booking and redirect to the clean URL, so it never stays in the address bar or history.
 */
function captureBookingToken(request: NextRequest): NextResponse | null {
  const match = request.nextUrl.pathname.match(/^\/reserva\/([^/]+)$/);
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

/** Refreshes the Supabase session cookie and keeps signed-out users out of the dashboard and admin. */
async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const to = request.nextUrl.clone();
    to.pathname = "/entrar";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const tokenRedirect = captureBookingToken(request);
  if (tokenRedirect) return tokenRedirect;
  if (!hasSupabase) return NextResponse.next(); // demo mode
  return refreshSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|vendor/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
