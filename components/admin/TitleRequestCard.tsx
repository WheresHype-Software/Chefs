"use client";

import { chefTitle } from "@/lib/format";
import { Link } from "@/lib/i18n/navigation";
import { useState } from "react";
import { refuseChefTitle, verifyChefTitle } from "@/app/admin/actions";
import { CertificateLinks } from "@/components/admin/CertificateLinks";
import { Chip } from "@/components/ui/Chip";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { CertificateDoc } from "@/lib/admin/certificates";

/** Ready-made reasons for refusing; the chef gets the text by email and can send another file. */
const REASONS = [
  "O documento está ilegível ou cortado.",
  "O nome no certificado não corresponde ao do perfil.",
  "Não é um certificado de formação em cozinha.",
  "A descrição não chega para confirmar a experiência: envie um certificado ou fotografias do seu trabalho.",
];

type Props = { chefId: string; name: string; slug: string; badges: string[]; docs: CertificateDoc[]; statements: string[] };

/** A cook asking to be called "Chef": see the certificate, then verify or refuse with a reason. */
export function TitleRequestCard({ chefId, name, slug, badges, docs, statements }: Props) {
  const [done, setDone] = useState<"verified" | "refused" | null>(null);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const verify = useServerAction(verifyChefTitle, { refresh: false, onSuccess: () => setDone("verified") });
  const refuse = useServerAction(refuseChefTitle, { refresh: false, onSuccess: () => setDone("refused") });
  const pending = verify.pending || refuse.pending;
  const previews = docs.filter((d) => d.image && d.url);

  if (done) {
    return (
      <article role="status" className="box px-5 py-4 text-[15px]">
        <strong className="font-semibold">{name}</strong>{" "}
        {done === "verified" ? `já aparece como Chef ${name} e recebeu um email.` : "recebeu o motivo por email e pode voltar a pedir."}
      </article>
    );
  }

  return (
    <article className="box flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-[18px] font-bold">
          {chefTitle(badges)} {name}
        </h3>
        <Link href={`/chef/${slug}`} target="_blank" className="text-sm font-semibold">
          Ver perfil ↗
        </Link>
      </div>

      {docs.length > 0 && <CertificateLinks docs={docs} />}
      {statements.map((text, i) => (
        <figure key={i} className="m-0 flex flex-col gap-1.5 rounded-[8px] bg-paper p-3.5">
          <figcaption className="lab">Sem certificado · a experiência descrita pelo cozinheiro</figcaption>
          <blockquote className="m-0 whitespace-pre-line text-[15px] [overflow-wrap:anywhere]">{text}</blockquote>
        </figure>
      ))}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {previews.map((d, i) => (
            <a key={i} href={d.url!} target="_blank" rel="noopener noreferrer" className="block w-full max-w-[320px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.url!}
                alt={`Certificado: ${d.title}`}
                className="max-h-[260px] w-full rounded-[8px] border border-line object-contain"
              />
            </a>
          ))}
        </div>
      )}
      <p className="m-0 text-xs text-muted">
        {docs.length > 0
          ? "Confirme que o documento é válido e está em nome desta pessoa. Os links duram 10 minutos."
          : "Sem documento: decida pela descrição, pelas fotografias dos pratos e pelas avaliações. Se tiver dúvidas, ligue-lhe."}
      </p>

      {refusing && (
        <div className="flex flex-col gap-2.5 rounded-[8px] bg-paper p-3.5">
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <Chip
                key={r}
                pressed={reason === r}
                onClick={() => setReason(r)}
                className="!h-auto !min-h-9 !whitespace-normal py-1.5 text-left"
              >
                {r}
              </Chip>
            ))}
          </div>
          <label className="field lab">
            Motivo (o chef recebe por email)
            <textarea rows={2} maxLength={800} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
      )}

      <FormMessage message={verify.message ?? refuse.message} />
      <div className="flex flex-wrap gap-2">
        {refusing ? (
          <>
            <button type="button" className="btn btn-sm" disabled={pending || !reason.trim()} onClick={() => refuse.run(chefId, reason)}>
              {refuse.pending ? "A enviar…" : "Recusar e avisar o chef"}
            </button>
            <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => setRefusing(false)}>
              Voltar
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => verify.run(chefId)}>
              {verify.pending ? "A verificar…" : "Verificar como Chef"}
            </button>
            <button type="button" className="btn btn-sm btn-o" disabled={pending} onClick={() => setRefusing(true)}>
              Recusar
            </button>
          </>
        )}
      </div>
    </article>
  );
}
