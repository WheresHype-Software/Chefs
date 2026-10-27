"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "link" | "password" | "signup";

export function SignInForm({ next, asChef }: { next: string; asChef: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(asChef ? "signup" : "link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = createClient();
    try {
      if (mode === "link") {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: callback() } });
        if (error) throw error;
        setMsg({ ok: true, text: `Enviámos um link de acesso para ${email}.` });
      } else if (mode === "password") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callback(), data: { name, role: asChef ? "chef" : "client" } },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else setMsg({ ok: true, text: `Confirme o email: enviámos um link para ${email}.` });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Não foi possível entrar." });
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Forma de entrar" className="flex flex-wrap gap-1 self-start rounded-[3px] border border-ink p-[3px]">
        {(
          [
            ["link", "Link por email"],
            ["password", "Palavra-passe"],
            ["signup", "Criar conta"],
          ] as [Mode, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            className="seg !min-h-9 !px-3 !text-[11px]"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
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
        {mode !== "link" && (
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
          </label>
        )}
        <button type="submit" className="btn" disabled={busy}>
          {mode === "link" ? "Enviar link" : mode === "password" ? "Entrar" : asChef ? "Criar conta de chef" : "Criar conta"}
        </button>
      </form>
      <button type="button" className="btn btn-o" onClick={google}>
        Continuar com Google
      </button>
      {msg && (
        <p role="status" className={`m-0 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
