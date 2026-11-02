"use client";

import Link from "next/link";
import { submitForReview } from "@/app/dashboard/actions/profile";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { MyChef } from "@/lib/dashboard";

export type VerificationPhotos = { selfie: number; gallery: number };

const STATUS_LABEL: Record<MyChef["status"], string> = {
  draft: "rascunho",
  pending: "em revisão",
  approved: "aprovado",
  rejected: "alterações pedidas",
  suspended: "suspenso",
};

/** Checklist, photo uploads and "send for review". */
export function ProfileVerification({ chef, photos }: { chef: MyChef | null; photos: VerificationPhotos }) {
  const submit = useServerAction(submitForReview, { successMessage: "Enviado para revisão. Respondemos por email." });
  const canSubmit = chef?.status === "draft" || chef?.status === "rejected";
  const checklist: [string, boolean][] = [
    ["Fotografia de perfil", photos.selfie > 0],
    ["Instagram ou site", Boolean(chef?.socials.instagram || chef?.socials.website)],
    [`Fotos de pratos (${photos.gallery}/3)`, photos.gallery >= 3],
  ];

  return (
    <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
      <div className="box flex flex-col gap-3 p-6">
        <h2 className="d m-0 text-2xl font-normal">Verificação</h2>
        <span className="text-sm text-muted">
          Uma fotografia de perfil, o Instagram ou site, e pelo menos três fotos de pratos. A equipa compara as fotos antes de o perfil
          ficar público.
        </span>
        <ul className="m-0 list-none border-t border-line p-0 text-sm">
          {checklist.map(([label, done]) => (
            <li key={label} className="flex justify-between border-b border-line py-2.5">
              <span>{label}</span>
              <span className={done ? "text-ok" : "text-muted"}>{done ? "Feito" : "Em falta"}</span>
            </li>
          ))}
        </ul>
        {chef ? (
          <Link href="/dashboard/fotos" className="btn btn-sm btn-o">
            Gerir fotografias
          </Link>
        ) : (
          <span className="text-sm text-muted">Guarde o perfil primeiro; depois carregue as fotografias.</span>
        )}
        <span className="lab mt-2 text-muted">Estado: {STATUS_LABEL[chef?.status ?? "draft"]}</span>
        {chef?.status === "rejected" && chef.verification_notes && <span className="text-sm text-danger">{chef.verification_notes}</span>}
        {canSubmit && (
          <button type="button" className="btn" disabled={submit.pending} onClick={() => submit.run()}>
            Enviar para revisão
          </button>
        )}
        <FormMessage message={submit.message} />
        <span className="text-xs text-muted">
          Ao enviar, aceita os termos para chefs: é responsável pela legalidade, higiene, impostos e pagamentos do seu serviço.
        </span>
      </div>
    </aside>
  );
}
