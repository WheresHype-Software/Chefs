import { NextResponse } from "next/server";
import { localizePath, splitLocale } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Magic link and Google OAuth land here with a ?code to exchange for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  // A link sent from the English site (next=/en/…) fails back to the English sign-in page.
  return NextResponse.redirect(`${origin}${localizePath("/entrar?erro=link", splitLocale(safeNext).locale)}`);
}
