"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
];

function errorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  // The person gets a sentence they can act on; the detail goes to the console, where whoever is
  // debugging can actually see which of these it was.
  console.error("[auth]", err);
  return ERRORS.find(([re]) => re.test(raw))?.[1] ?? "Não foi possível entrar. Tente de novo.";
}

export function SignInForm({ next, asChef }: { next: string; asChef: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(asChef ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function go() {
    router.push(next);
    router.refresh();
  }

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
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            // Only used if email confirmation is switched on in Supabase.
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: { name, role: asChef ? "chef" : "client" },
          },
        });
        if (error) throw error;
        // Ads measurement: no-op unless the visitor accepted cookies.
        trackPixel("CompleteRegistration", { content_name: asChef ? "chef" : "client" });
        if (data.session) go();
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
      <form onSubmit={submit} className="flex flex-col gap-4">
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
        {mode === "recover" && (
          <p className="m-0 text-sm text-muted">Enviamos-lhe uma ligação por email para escolher uma nova palavra-passe.</p>
        )}
        <button type="submit" className="btn" disabled={busy}>
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
      </form>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`m-0 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
