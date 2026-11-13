"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { submitForReview } from "@/app/dashboard/actions/profile";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";

export type ReviewItem = { label: string; done: boolean; href: string };

/** Last onboarding step: what the review needs, ticked off, and the button that sends it. */
export function OnboardingSubmit({ items, notes }: { items: ReviewItem[]; notes: string | null }) {
  const t = useTranslations("dashboard.profile.submit");
  const router = useRouter();
  const submit = useServerAction(submitForReview, { refresh: false, onSuccess: () => router.push("/dashboard") });
  const ready = items.every((i) => i.done);

  return (
    <section aria-labelledby="enviar" data-lumi="enviar" className="box flex max-w-[640px] flex-col gap-4 p-6">
      <h2 id="enviar" className="d m-0 text-2xl font-normal">
        {t("title")}
      </h2>
      <p className="m-0 text-sm text-muted">{t("intro")}</p>
      {notes && <p className="m-0 text-sm text-danger">{t("changesRequested", { notes })}</p>}
      <ul className="m-0 list-none border-t border-line p-0 text-sm">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
            <span>{i.label}</span>
            {i.done ? (
              <span className="text-ok">{t("done")}</span>
            ) : (
              <Link href={i.href} className="font-semibold">
                {t("missing")}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="btn self-start" disabled={!ready || submit.pending} onClick={() => submit.run()}>
        {submit.pending ? t("sending") : t("submit")}
      </button>
      <FormMessage message={submit.message} />
    </section>
  );
}
