"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { submitForReview } from "@/app/dashboard/actions/profile";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { MyChef } from "@/lib/dashboard";

export type VerificationPhotos = { portrait: number; selfie: number; gallery: number; approved: boolean };

/** Checklist, photo uploads and "send for review". */
export function ProfileVerification({ chef, photos }: { chef: MyChef | null; photos: VerificationPhotos }) {
  const t = useTranslations("dashboard.profile.verification");
  const ti = useTranslations("dashboard.onboarding.items");
  const submit = useServerAction(submitForReview, { successMessage: t("sent") });
  const canSubmit = chef?.status === "draft" || chef?.status === "rejected";
  const list: [string, boolean][] = [
    [ti("portrait"), photos.portrait > 0],
    // An approved profile's selfie was deleted after the check.
    [ti("selfie"), photos.selfie > 0 || photos.approved],
    [ti("social"), Boolean(chef?.socials.instagram || chef?.socials.website)],
    [ti("dishes", { count: photos.gallery }), photos.gallery >= 3],
  ];

  return (
    <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
      <div className="box flex flex-col gap-3 p-6">
        <h2 className="d m-0 text-2xl font-normal">{t("title")}</h2>
        <span className="text-sm text-muted">{t("intro")}</span>
        <ul className="m-0 list-none border-t border-line p-0 text-sm">
          {list.map(([label, done]) => (
            <li key={label} className="flex justify-between border-b border-line py-2.5">
              <span>{label}</span>
              <span className={done ? "text-ok" : "text-muted"}>{done ? t("done") : t("missing")}</span>
            </li>
          ))}
        </ul>
        {chef ? (
          <Link href="#fotografias" className="btn btn-sm btn-o">
            {t("manage")}
          </Link>
        ) : (
          <span className="text-sm text-muted">{t("saveFirst")}</span>
        )}
        <span className="lab mt-2 text-muted">{t("statusLine", { status: t(`status.${chef?.status ?? "draft"}`) })}</span>
        {chef?.status === "rejected" && chef.verification_notes && <span className="text-sm text-danger">{chef.verification_notes}</span>}
        {canSubmit && (
          <button type="button" className="btn" disabled={submit.pending} onClick={() => submit.run()}>
            {t("submit")}
          </button>
        )}
        <FormMessage message={submit.message} />
        <span className="text-xs text-muted">{t("terms")}</span>
      </div>
    </aside>
  );
}
