"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { useCertificateUpload } from "@/hooks/useCertificateUpload";
import { isVerifiedChef } from "@/lib/format";

type Props = { name: string; badges: string[]; certificates: { id: string; title: string }[]; userId: string | null };

/** "Chef" or "Cozinheiro": how the title is earned, what was sent, and the form to send a certificate. */
export function ChefTitleCard({ name, badges, certificates, userId }: Props) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const { send, sending, message } = useCertificateUpload(userId);

  if (isVerifiedChef(badges)) {
    return (
      <section aria-labelledby="titulo-chef" className="box flex flex-col gap-2 p-6">
        <h2 id="titulo-chef" className="d m-0 flex items-center gap-2 text-2xl font-normal">
          <span className="text-cobalt">
            <VerifiedIcon size={22} />
          </span>
          Chef verificado
        </h2>
        <p className="m-0 text-sm text-muted">
          A equipa verificou o seu certificado. Aparece aos clientes como <strong className="text-ink">Chef {name}</strong>, com a marca
          «Chef verificado».
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-chef" className="box flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <h2 id="titulo-chef" className="d m-0 text-2xl font-normal">
          Título de Chef
        </h2>
        <p className="m-0 text-sm text-muted">
          Hoje aparece como <strong className="text-ink">Cozinheiro {name}</strong>. Se tem formação em cozinha, envie um certificado (curso
          de cozinha, escola de hotelaria, diploma profissional). Depois de a equipa o verificar, passa a aparecer como{" "}
          <strong className="text-ink">Chef {name}</strong>, com a marca «Chef verificado».
        </p>
      </div>

      {certificates.length > 0 && (
        <ul className="m-0 list-none border-t border-line p-0 text-sm">
          {certificates.map((c) => (
            <li key={c.id} className="flex justify-between gap-3 border-b border-line py-2.5">
              <span className="min-w-0 [overflow-wrap:anywhere]">{c.title}</span>
              <span className="shrink-0 text-muted">Em verificação</span>
            </li>
          ))}
        </ul>
      )}

      <form
        key={formKey}
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await send(title, file)) {
            setTitle("");
            setFile(null);
            setFormKey((k) => k + 1);
          }
        }}
      >
        <Field label="Nome do certificado">
          <input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Curso de Cozinha, Escola de Hotelaria"
          />
        </Field>
        <Field label="Ficheiro" hint="PDF, JPG ou PNG até 10 MB. Só a equipa do Ao Lume o pode abrir.">
          <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <FormMessage message={message} />
        <button type="submit" className="btn btn-sm self-start" disabled={sending}>
          {sending ? "A enviar…" : "Enviar certificado"}
        </button>
      </form>
    </section>
  );
}
