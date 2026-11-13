import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { redirectLocalized } from "@/lib/i18n/server";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { SiteHeader } from "@/components/SiteChrome";
import type { Locale } from "@/lib/i18n/routing";
import { alternates } from "@/lib/seo";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/palavra-passe">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("newPassword"), robots: { index: false }, alternates: alternates("/palavra-passe", locale) };
}

/**
 * Where the recovery link lands, once /auth/callback has turned its code into a session.
 *
 * Deliberately outside /conta: that area sends chefs to their dashboard, and a chef resetting a
 * password would be bounced away from the very page they were sent to. This one works for
 * everybody and decides afterwards where each person belongs.
 */
export default async function NovaPalavraPasse() {
  if (!hasSupabase) return redirectLocalized("/entrar");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  // No session means the link expired, was already used, or was opened in another browser.
  if (!user) return redirectLocalized("/entrar?erro=link");

  const t = await getTranslations("auth.newPassword");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const next = profile?.role === "admin" ? "/admin" : profile?.role === "chef" ? "/dashboard" : "/conta";

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5 py-12 md:px-8 md:py-16">
        <div className="flex flex-col gap-3">
          <h1 className="d m-0 text-[clamp(30px,4vw,42px)] leading-[1.05]">{t("title")}</h1>
          <p className="m-0 text-muted">{t("settingFor", { email: user.email ?? "" })}</p>
        </div>
        <div className="box p-5 sm:p-7">
          <NewPasswordForm next={next} />
        </div>
        <p className="m-0 text-sm text-muted">
          {t.rich("notYou", { support: (c) => <Link href="/apoio">{c}</Link> })}
        </p>
      </main>
    </div>
  );
}
