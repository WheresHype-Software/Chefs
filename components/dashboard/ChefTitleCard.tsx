"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { addTitleStatement } from "@/app/dashboard/actions/certificates";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { useCertificateUpload } from "@/hooks/useCertificateUpload";
import { useServerAction } from "@/hooks/useServerAction";
import { chefTitle, isVerifiedChef } from "@/lib/format";
import { type Locale } from "@/lib/i18n/routing";

type Props = {
  name: string;
  badges: string[];
  certificates: { id: string; title: string }[];
  /** Descriptions of experience sent instead of a certificate. */
  statements: { id: string }[];
  userId: string | null;
};

/** "Chef" or "Cozinheiro": how the title is earned, what was sent, and the form to send a certificate. */
export function ChefTitleCard({ name, badges, certificates, statements, userId }: Props) {
  const t = useTranslations("dashboard.title");
  const locale = useLocale() as Locale;
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const { send, sending, message } = useCertificateUpload(userId);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [story, setStory] = useState("");
  const statement = useServerAction(addTitleStatement, {
    successMessage: t("statementSent"),
    onSuccess: () => setStory(""),
  });

  if (isVerifiedChef(badges)) {
    return (
      <section aria-labelledby="titulo-chef" className="box flex flex-col gap-2 p-6">
        <h2 id="titulo-chef" className="d m-0 flex items-center gap-2 text-2xl font-normal">
          <span className="text-cobalt">
            <VerifiedIcon size={22} />
          </span>
          {t("verifiedTitle")}
        </h2>
        <p className="m-0 text-sm text-muted">
          {t.rich("verifiedText", { name, strong: (c) => <strong className="text-ink">{c}</strong> })}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-chef" className="box flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <h2 id="titulo-chef" className="d m-0 text-2xl font-normal">
          {t("title")}
        </h2>
        <p className="m-0 text-sm text-muted">
          {t.rich("intro", { name, current: chefTitle(badges, locale), strong: (c) => <strong className="text-ink">{c}</strong> })}
        </p>
      </div>

      {(certificates.length > 0 || statements.length > 0) && (
        <ul className="m-0 list-none border-t border-line p-0 text-sm">
          {certificates.map((c) => (
            <li key={c.id} className="flex justify-between gap-3 border-b border-line py-2.5">
              <span className="min-w-0 [overflow-wrap:anywhere]">{c.title}</span>
              <span className="shrink-0 text-muted">{t("inReview")}</span>
            </li>
          ))}
          {statements.map((c) => (
            <li key={c.id} className="flex justify-between gap-3 border-b border-line py-2.5">
              <span className="min-w-0">{t("statement")}</span>
              <span className="shrink-0 text-muted">{t("inReview")}</span>
            </li>
          ))}
        </ul>
      )}

      <div role="group" aria-label={t("modeLabel")} className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "file" ? "" : "btn-o"}`}
          aria-pressed={mode === "file"}
          onClick={() => setMode("file")}
        >
          {t("haveCert")}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "text" ? "" : "btn-o"}`}
          aria-pressed={mode === "text"}
          onClick={() => setMode("text")}
        >
          {t("noCert")}
        </button>
      </div>

      {mode === "text" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            statement.run(story);
          }}
        >
          <Field label={t("experience")} hint={t("experienceHint")}>
            <textarea
              rows={5}
              maxLength={1500}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder={t("experiencePlaceholder")}
            />
          </Field>
          <FormMessage message={statement.message} />
          <button type="submit" className="btn btn-sm self-start" disabled={statement.pending || story.trim().length < 20}>
            {statement.pending ? t("sending") : t("sendToTeam")}
          </button>
        </form>
      )}

      {mode === "file" && (
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
          <Field label={t("certName")}>
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={t("certPlaceholder")} />
          </Field>
          <Field label={t("file")} hint={t("fileHint")}>
            <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <FormMessage message={message} />
          <button type="submit" className="btn btn-sm self-start" disabled={sending}>
            {sending ? t("sending") : t("sendCert")}
          </button>
        </form>
      )}
    </section>
  );
}
