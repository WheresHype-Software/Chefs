"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
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
  const t = useTranslations("auth.newPassword");
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
      setError(t("errors.mismatch"));
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
      if (/should be at least|weak|short/i.test(raw)) setError(t("errors.tooShort"));
      else if (/same.*password|different from the old/i.test(raw)) setError(t("errors.samePassword"));
      else if (/session|jwt|expired|not authenticated/i.test(raw)) setError(t("errors.expired"));
      else setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="m-0 text-ok">{t("done")}</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="field lab">
        {t("password")}
        <input
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className={`hint ${tooShort ? "text-danger" : ""}`}>{t("passwordHint")}</span>
      </label>
      <label className="field lab">
        {t("again")}
        <input
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        {mismatch && <span className="hint text-danger">{t("mismatchHint")}</span>}
      </label>
      <button type="submit" className="btn" disabled={busy || password.length < 8 || password !== again}>
        {busy ? t("saving") : t("submit")}
      </button>
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
