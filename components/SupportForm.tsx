"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { callAction } from "@/lib/call-action";
import { submitTicket } from "@/lib/support";

const CATEGORIES = [
  ["reserva", "Uma reserva"],
  ["pagamento", "Um pagamento"],
  ["conta", "A minha conta"],
  ["chef", "Sou chef"],
  ["outro", "Outro assunto"],
] as const;

type Form = {
  name: string;
  email: string;
  phone: string;
  category: (typeof CATEGORIES)[number][0];
  bookingRef: string;
  subject: string;
  body: string;
  website: string;
};

const EMPTY: Form = { name: "", email: "", phone: "", category: "reserva", bookingRef: "", subject: "", body: "", website: "" };

/** Writing to us. No account needed, and the reference comes back on screen and by email. */
export function SupportForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (sent) {
    return (
      <section className="box flex flex-col gap-2.5 p-6">
        <h2 className="d m-0 text-[28px]">Mensagem enviada</h2>
        <p className="m-0 text-muted">
          A sua referência é <strong className="num text-ink">{sent}</strong>. Enviámos-lhe uma cópia por email e respondemos normalmente no
          mesmo dia útil.
        </p>
        <button type="button" className="btn btn-o btn-sm self-start" onClick={() => (setSent(null), setForm(EMPTY))}>
          Escrever outra mensagem
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
        <Field label="O seu nome" required>
          <input required maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" required hint="É para aqui que respondemos.">
          <input
            required
            type="email"
            maxLength={160}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Telemóvel" hint="Opcional, se preferir que liguemos.">
          <input type="tel" maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
        </Field>
        <Field label="Sobre o quê" required>
          <select value={form.category} onChange={(e) => set("category", e.target.value as Form["category"])}>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {(form.category === "reserva" || form.category === "pagamento") && (
        <Field label="Número do pedido" hint="Começa por AL- e está no email que recebeu. Ajuda-nos a responder mais depressa.">
          <input maxLength={40} value={form.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} placeholder="AL-1104-0493" />
        </Field>
      )}

      <Field label="Assunto" required>
        <input required minLength={3} maxLength={200} value={form.subject} onChange={(e) => set("subject", e.target.value)} />
      </Field>
      <Field label="A sua mensagem" required>
        <textarea required rows={6} minLength={10} maxLength={8000} value={form.body} onChange={(e) => set("body", e.target.value)} />
      </Field>

      {/* Left empty by people, filled in by robots. */}
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn" disabled={busy}>
          {busy ? "A enviar…" : "Enviar mensagem"}
        </button>
        {error && <FormMessage message={{ ok: false, text: error }} />}
      </div>
    </form>
  );
}
