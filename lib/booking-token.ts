// Guests open their booking with a magic-link token. The email link carries it once as ?t=;
// after that it lives in an httpOnly cookie scoped to that booking's page, so it never sits
// in the address bar, browser history, referrers or client JavaScript.

const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // matches guest_tokens.expires_at

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN_RE = /^[0-9a-f]{48}$/i;

export function bookingTokenCookieName(bookingId: string): string {
  return `al_bt_${bookingId}`;
}

export function bookingTokenCookieOptions(bookingId: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: `/reserva/${bookingId}`,
    maxAge: MAX_AGE_SECONDS,
  };
}
