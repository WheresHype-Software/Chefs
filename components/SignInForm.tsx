"use client";

import { useRouter } from "@/lib/i18n/navigation";
import { useState } from "react";
import { signUpWithTerms } from "@/app/auth/actions";
import { RoleChoice, type Role } from "@/components/auth/RoleChoice";
import { trackPixel } from "@/lib/meta-pixel";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "recover";

const TABS: [Mode, string][] = [
  ["signin", "Entrar"],
  ["signup", "Criar conta"],
];

// Supabase answers in English; show the common cases in Portuguese.
const ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, "Email ou palavra-passe errados."],
  [/supabase is not configured/i, "A ligação à base de dados não está carregada nesta página. Recarregue (Ctrl+Shift+R) e tente de novo."],
  [/failed to fetch|networkerror|load failed/i, "Não conseguimos falar com o servidor. Verifique a ligação e tente de novo."],
  [/email not confirmed/i, "Confirme primeiro o seu email."],
  [/already registered|already exists/i, "Já existe uma conta com este email. Entre com a palavra-passe."],
  [/password should be at least/i, "A palavra-passe precisa de pelo menos 8 caracteres."],
  [/rate limit|too many/i, "Demasiadas tentativas. Tente de novo dentro de alguns minutos."],
  [/terms not accepted/i, "Para criar a conta, aceite os termos."],
];

function errorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  // The person gets a sentence they can act on; the detail goes to the console, where whoever is
  // debugging can actually see which of these it was.
  console.error("[auth]", err);
  return ERRORS.find(([re]) => re.test(raw))?.[1] ?? "Não foi possível entrar. Tente de novo.";
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
    router.push(to);
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
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/palavra-passe")}`,
        });
        if (error) throw error;
        setMsg({ ok: true, text: `Se existir uma conta com ${email}, enviámos-lhe uma ligação para definir uma nova palavra-passe.` });
      } else if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        go();
      } else {
        // On the server, so the acceptance of the terms is recorded with the account, in one go.
        const res = await signUpWithTerms({ name, email, password, asChef, next: afterSignup, accepted });
        if (!res.ok) throw new Error(res.error);
        // Ads measurement: no-op unless the visitor accepted cookies.
        trackPixel("CompleteRegistration", { content_name: asChef ? "chef" : "client" });
        if (res.session) go(afterSignup);
        else setMsg({ ok: true, text: `Conta criada. Confirme o email que enviámos para ${email}.` });
      }
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Entrar ou criar conta" className="grid grid-cols-2 gap-1 rounded-[3px] border border-line-2 p-1">
        {TABS.map(([k, label]) => (
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
            {label}
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
                {asChef ? "Conta de chef: para cozinhar e receber pedidos" : "Conta de cliente: para reservar"}
              </span>
              <button
                type="button"
                onClick={() => setRole(null)}
                className={`shrink-0 cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[14px] underline ${asChef ? "text-yolk" : "text-cobalt"}`}
              >
                Trocar
              </button>
            </div>
          )}
          {mode === "signup" && (
            <label className="field lab">
              Nome
              <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="field lab">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {mode !== "recover" && (
            <label className="field lab">
              Palavra-passe
              <input
                required
                type="password"
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && <span className="hint">Pelo menos 8 caracteres.</span>}
            </label>
          )}
          {mode === "signup" && (
            // Never pre-ticked, and the button waits for it: the acceptance has to be a choice.
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
              <span>
                Li e aceito os{" "}
                <a href="/termos" target="_blank" rel="noopener">
                  Termos e condições
                </a>
                {asChef && (
                  <>
                    {" "}
                    e o{" "}
                    <a href="/contrato-chefs" target="_blank" rel="noopener">
                      Contrato de intermediação de pagamentos
                    </a>
                  </>
                )}
                .{" "}
                <span className="text-muted">
                  Saiba como tratamos os seus dados na{" "}
                  <a href="/privacidade" target="_blank" rel="noopener">
                    Política de privacidade
                  </a>
                  .
                </span>
              </span>
            </label>
          )}
          {mode === "recover" && (
            <p className="m-0 text-sm text-muted">Enviamos-lhe uma ligação por email para escolher uma nova palavra-passe.</p>
          )}
          <button type="submit" className="btn" disabled={busy || (mode === "signup" && !accepted)}>
            {busy
              ? "Um momento…"
              : mode === "recover"
                ? "Enviar ligação"
                : mode === "signin"
                  ? "Entrar"
                  : asChef
                    ? "Criar conta de chef"
                    : "Criar conta"}
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
              Esqueceu-se da palavra-passe?
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
              Voltar a entrar
            </button>
          )}
          {mode === "signin" && (
            <p className="m-0 border-t border-line pt-3 text-sm text-muted">
              Chefs e clientes entram aqui com o mesmo formulário.{" "}
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-sm font-semibold text-cobalt underline"
                onClick={() => {
                  setMode("signup");
                  setMsg(null);
                }}
              >
                Ainda não tem conta?
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
