"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Setting a new password, after the link in the recovery email has been opened.
 *
 * By the time this renders the person already has a session — that is what the link did. So all
 * that is left is to choose the password, and to make the two common mistakes impossible to miss:
 * a typo in the confirmation, and one that is too short.
 */
export function NewPasswordForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = again.length > 0 && again !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== again) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await createClient().auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      router.push(next);
      router.refresh();
    } catch (err) {
      console.error("[auth] updateUser:", err);
      const raw = err instanceof Error ? err.message : "";
      if (/should be at least|weak|short/i.test(raw)) setError("A palavra-passe precisa de pelo menos 8 caracteres.");
      else if (/same.*password|different from the old/i.test(raw)) setError("Escolha uma palavra-passe diferente da anterior.");
      else if (/session|jwt|expired|not authenticated/i.test(raw)) setError("A ligação expirou. Peça uma nova no ecrã de entrada.");
      else setError("Não foi possível guardar a palavra-passe. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="m-0 text-ok">Palavra-passe alterada. A entrar…</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="field lab">
        Nova palavra-passe
        <input
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className={`hint ${tooShort ? "text-danger" : ""}`}>Pelo menos 8 caracteres.</span>
      </label>
      <label className="field lab">
        Repita a palavra-passe
        <input
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        {mismatch && <span className="hint text-danger">Não coincide com a de cima.</span>}
      </label>
      <button type="submit" className="btn" disabled={busy || password.length < 8 || password !== again}>
        {busy ? "A guardar…" : "Guardar e entrar"}
      </button>
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
