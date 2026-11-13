"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { callAction } from "@/lib/call-action";
import { submitTicket } from "@/lib/support";

const CATEGORIES = ["reserva", "pagamento", "conta", "chef", "outro"] as const;

type Form = {
  name: string;
  email: string;
  phone: string;
  category: (typeof CATEGORIES)[number];
  bookingRef: string;
  subject: string;
  body: string;
  website: string;
};

const EMPTY: Form = { name: "", email: "", phone: "", category: "reserva", bookingRef: "", subject: "", body: "", website: "" };

/** Writing to us. No account needed, and the reference comes back on screen and by email. */
export function SupportForm() {
  const t = useTranslations("support.form");
  const tc = useTranslations("common.actions");
  const [form, setForm] = useState<Form>(EMPTY);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (sent) {
    return (
      <section className="box flex flex-col gap-2.5 p-6">
        <h2 className="d m-0 text-[28px]">{t("sentTitle")}</h2>
        <p className="m-0 text-muted">
          {t.rich("sentText", { ref: sent, b: (c) => <strong className="num text-ink">{c}</strong> })}
        </p>
        <button type="button" className="btn btn-o btn-sm self-start" onClick={() => (setSent(null), setForm(EMPTY))}>
          {t("writeAnother")}
        </button>
      </section>
    );
  }

  return (
    <form
      className="box flex flex-col gap-5 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await callAction(() => submitTicket(form));
        setBusy(false);
        if (result.ok) setSent(result.ref);
        else setError(result.error);
      }}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Field label={t("name")} required>
          <input required maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        </Field>
        <Field label={t("email")} required hint={t("emailHint")}>
          <input
            required
            type="email"
            maxLength={160}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label={t("phone")} hint={t("phoneHint")}>
          <input type="tel" maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
        </Field>
        <Field label={t("category")} required>
          <select value={form.category} onChange={(e) => set("category", e.target.value as Form["category"])}>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`categories.${value}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {(form.category === "reserva" || form.category === "pagamento") && (
        <Field label={t("bookingRef")} hint={t("bookingRefHint")}>
          <input maxLength={40} value={form.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} placeholder="AL-1104-0493" />
        </Field>
      )}

      <Field label={t("subject")} required>
        <input required minLength={3} maxLength={200} value={form.subject} onChange={(e) => set("subject", e.target.value)} />
      </Field>
      <Field label={t("body")} required>
        <textarea required rows={6} minLength={10} maxLength={8000} value={form.body} onChange={(e) => set("body", e.target.value)} />
      </Field>

      {/* Left empty by people, filled in by robots. */}
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn" disabled={busy}>
          {busy ? tc("sending") : t("submit")}
        </button>
        {error && <FormMessage message={{ ok: false, text: error }} />}
      </div>
    </form>
  );
}
