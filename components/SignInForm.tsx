"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { signUpWithTerms } from "@/app/auth/actions";
import { RoleChoice, type Role } from "@/components/auth/RoleChoice";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { DEFAULT_LOCALE, localizePath, splitLocale, type Locale } from "@/lib/i18n/routing";
import { trackPixel } from "@/lib/meta-pixel";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "recover";

const TABS = ["signin", "signup"] as const;

type ErrorKey =
  | "invalidCredentials"
  | "notConfigured"
  | "network"
  | "emailNotConfirmed"
  | "alreadyRegistered"
  | "passwordTooShort"
  | "rateLimited"
  | "termsNotAccepted";

// Supabase answers in English; show the common cases in the visitor's language.
const ERRORS: [RegExp, ErrorKey][] = [
  [/invalid login credentials/i, "invalidCredentials"],
  [/supabase is not configured/i, "notConfigured"],
  [/failed to fetch|networkerror|load failed/i, "network"],
  [/email not confirmed/i, "emailNotConfirmed"],
  [/already registered|already exists/i, "alreadyRegistered"],
  [/password should be at least/i, "passwordTooShort"],
  [/rate limit|too many/i, "rateLimited"],
  [/terms not accepted/i, "termsNotAccepted"],
];

function errorKey(err: unknown): ErrorKey | "generic" {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  // The person gets a sentence they can act on; the detail goes to the console, where whoever is
  // debugging can actually see which of these it was.
  console.error("[auth]", err);
  return ERRORS.find(([re]) => re.test(raw))?.[1] ?? "generic";
}

/**
 * Where a `next` path goes: "/en/conta" stays in English, an unprefixed "/conta" opens in the
 * language the form is shown in (an English visitor is not dropped into Portuguese on sign-in).
 */
function destination(to: string, current: Locale): { path: string; locale: Locale } {
  const s = splitLocale(to);
  return { path: s.path, locale: s.locale === DEFAULT_LOCALE ? current : s.locale };
}

type Props = {
  /** Where to go after signing in, or after a client creates an account. */
  next: string;
  /** Came from a "Criar perfil de chef" button: open on sign-up with the chef side already chosen. */
  asChef: boolean;
  /** Open on "Criar conta" (with the question), e.g. from a "Criar conta" link. */
  startOnSignup?: boolean;
};

export function SignInForm({ next, asChef: chefDoor, startOnSignup = false }: Props) {
  const router = useRouter();
  const t = useTranslations("auth.form");
  const locale = useLocale() as Locale;
  const [mode, setMode] = useState<Mode>(chefDoor || startOnSignup ? "signup" : "signin");
  // Who the new account is for. Nothing is chosen until the person says so.
  const [role, setRole] = useState<Role | null>(chefDoor ? "chef" : null);
  const asChef = role === "chef";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function go(to = next) {
    const d = destination(to, locale);
    router.push(d.path, { locale: d.locale });
    router.refresh();
  }
  // A new chef starts on the profile steps; a client goes where they were heading.
  const afterSignup = asChef ? "/dashboard/comecar" : next;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = createClient();
    try {
      if (mode === "recover") {
        // Always the same answer, whether or not the address has an account: telling a stranger
        // which emails are registered here is not ours to tell.
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(localizePath("/palavra-passe", locale))}`,
        });
        if (error) throw error;
        setMsg({ ok: true, text: t("recoverSent", { email }) });
      } else if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        go();
      } else {
        // On the server, so the acceptance of the terms is recorded with the account, in one go.
        // The link in the confirmation email is a plain URL: it carries the language in its path.
        const d = destination(afterSignup, locale);
        const res = await signUpWithTerms({ name, email, password, asChef, next: localizePath(d.path, d.locale), accepted });
        if (!res.ok) throw new Error(res.error);
        // Ads measurement: no-op unless the visitor accepted cookies.
        trackPixel("CompleteRegistration", { content_name: asChef ? "chef" : "client" });
        if (res.session) go(afterSignup);
        else setMsg({ ok: true, text: t("confirmEmail", { email }) });
      }
    } catch (err) {
      setMsg({ ok: false, text: t(`errors.${errorKey(err)}`) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("tabsLabel")} className="grid grid-cols-2 gap-1 rounded-[3px] border border-line-2 p-1">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === "signin" ? mode !== "signup" : mode === "signup"}
            onClick={() => {
              setMode(k);
              setMsg(null);
            }}
            className={`min-h-10 cursor-pointer rounded-[2px] border-0 font-[inherit] text-[15px] font-semibold transition-colors ${
              (k === "signin" ? mode !== "signup" : mode === "signup") ? "bg-cobalt text-white" : "bg-transparent text-ink hover:bg-paper"
            }`}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>
      {mode === "signup" && !role ? (
        <RoleChoice
          onPick={(r) => {
            setRole(r);
            setMsg(null);
          }}
        />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === "signup" && role && (
            <div
              className={`flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-[14px] ${
                asChef ? "bg-ink text-white" : "bg-cobalt-soft text-cobalt-deep"
              }`}
            >
              <span className="font-semibold">
                {asChef ? t("role.chef") : t("role.client")}
              </span>
              <button
                type="button"
                onClick={() => setRole(null)}
                className={`shrink-0 cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[14px] underline ${asChef ? "text-yolk" : "text-cobalt"}`}
              >
                {t("role.change")}
              </button>
            </div>
          )}
          {mode === "signup" && (
            <label className="field lab">
              {t("name")}
              <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="field lab">
            {t("email")}
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {mode !== "recover" && (
            <label className="field lab">
              {t("password")}
              <input
                required
                type="password"
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && <span className="hint">{t("passwordHint")}</span>}
            </label>
          )}
          {mode === "signup" && (
            // Never pre-ticked, and the button waits for it: the acceptance has to be a choice.
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
              <span>
                {t.rich("acceptTerms", {
                  role: asChef ? "chef" : "client",
                  terms: (c) => (
                    <Link href="/termos" target="_blank" rel="noopener">
                      {c}
                    </Link>
                  ),
                  contract: (c) => (
                    <Link href="/contrato-chefs" target="_blank" rel="noopener">
                      {c}
                    </Link>
                  ),
                  privacy: (c) => (
                    <Link href="/privacidade" target="_blank" rel="noopener">
                      {c}
                    </Link>
                  ),
                  muted: (c) => <span className="text-muted">{c}</span>,
                })}
              </span>
            </label>
          )}
          {mode === "recover" && (
            <p className="m-0 text-sm text-muted">{t("recoverHint")}</p>
          )}
          <button type="submit" className="btn" disabled={busy || (mode === "signup" && !accepted)}>
            {busy
              ? t("busy")
              : mode === "recover"
                ? t("submit.recover")
                : mode === "signin"
                  ? t("submit.signin")
                  : asChef
                    ? t("submit.signupChef")
                    : t("submit.signup")}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              className="-mt-1 cursor-pointer self-start border-0 bg-transparent p-0 font-[inherit] text-sm text-muted underline hover:text-ink"
              onClick={() => {
                setMode("recover");
                setMsg(null);
              }}
            >
              {t("forgotPassword")}
            </button>
          )}
          {mode === "recover" && (
            <button
              type="button"
              className="-mt-1 cursor-pointer self-start border-0 bg-transparent p-0 font-[inherit] text-sm text-muted underline hover:text-ink"
              onClick={() => {
                setMode("signin");
                setMsg(null);
              }}
            >
              {t("backToSignIn")}
            </button>
          )}
          {mode === "signin" && (
            <p className="m-0 border-t border-line pt-3 text-sm text-muted">
              {t("sameForm")}{" "}
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-sm font-semibold text-cobalt underline"
                onClick={() => {
                  setMode("signup");
                  setMsg(null);
                }}
              >
                {t("noAccount")}
              </button>
            </p>
          )}
        </form>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`m-0 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
