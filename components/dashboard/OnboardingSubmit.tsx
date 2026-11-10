"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitForReview } from "@/app/dashboard/actions/profile";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";

export type ReviewItem = { label: string; done: boolean; href: string };

/** Last onboarding step: what the review needs, ticked off, and the button that sends it. */
export function OnboardingSubmit({ items, notes }: { items: ReviewItem[]; notes: string | null }) {
  const router = useRouter();
  const submit = useServerAction(submitForReview, { refresh: false, onSuccess: () => router.push("/dashboard") });
  const ready = items.every((i) => i.done);

  return (
    <section aria-labelledby="enviar" data-lumi="enviar" className="box flex max-w-[640px] flex-col gap-4 p-6">
      <h2 id="enviar" className="d m-0 text-2xl font-normal">
        Enviar para revisão
      </h2>
      <p className="m-0 text-sm text-muted">
        A equipa compara a selfie com a fotografia de perfil e vê os seus pratos. Respondemos por email, normalmente no mesmo dia útil.
        Depois disso o seu perfil aparece nas pesquisas.
      </p>
      {notes && <p className="m-0 text-sm text-danger">Pedimos alterações: {notes}</p>}
      <ul className="m-0 list-none border-t border-line p-0 text-sm">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
            <span>{i.label}</span>
            {i.done ? (
              <span className="text-ok">Feito</span>
            ) : (
              <Link href={i.href} className="font-semibold">
                Em falta →
              </Link>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="btn self-start" disabled={!ready || submit.pending} onClick={() => submit.run()}>
        {submit.pending ? "A enviar…" : "Enviar para revisão"}
      </button>
      <FormMessage message={submit.message} />
      <span className="text-xs text-muted">
        Ao enviar, aceita os termos para chefs: é responsável pela legalidade, higiene, impostos e pagamentos do seu serviço.
      </span>
    </section>
  );
}
