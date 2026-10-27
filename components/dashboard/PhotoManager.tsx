"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deletePhoto, movePhoto, updatePhotoCaption } from "@/app/dashboard/actions";
import { FormMessage, type FormMessageValue } from "@/components/ui/FormMessage";
import { Photo } from "@/components/ui/Photo";
import { usePhotoUpload, type UploadKind } from "@/hooks/usePhotoUpload";
import type { ChefPhoto } from "@/lib/dashboard";
import type { ActionResult } from "@/lib/result";

type Change = { type: "delete"; id: string } | { type: "move"; id: string; to: "first" | -1 | 1 };

function reorder(list: ChefPhoto[], change: Change): ChefPhoto[] {
  const from = list.findIndex((p) => p.id === change.id);
  if (from < 0) return list;
  const next = [...list];
  if (change.type === "delete") {
    next.splice(from, 1);
    return next;
  }
  const to = change.to === "first" ? 0 : Math.min(list.length - 1, Math.max(0, from + change.to));
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/** File picker styled as a button; the label keeps it keyboard- and screen-reader-friendly. */
function UploadButton({
  kind,
  label,
  busy,
  onFiles,
  primary = false,
}: {
  kind: UploadKind;
  label: string;
  busy: boolean;
  onFiles: (kind: UploadKind, files: FileList | null) => void;
  primary?: boolean;
}) {
  return (
    <label className={`btn btn-sm ${primary ? "" : "btn-o"} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
      {busy ? "A carregar…" : label}
      <input
        type="file"
        accept="image/*"
        multiple={kind === "gallery"}
        className="sr-only"
        onChange={(e) => {
          onFiles(kind, e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** Caption editor; saves when the field loses focus and the text changed. */
function CaptionField({ photo, onSaved }: { photo: ChefPhoto; onSaved: (r: ActionResult) => void }) {
  const [text, setText] = useState(photo.caption ?? "");
  const [saved, setSaved] = useState(photo.caption ?? "");
  const [pending, start] = useTransition();
  return (
    <label className="flex flex-col gap-1">
      <span className="sr-only">Descrição do prato</span>
      <textarea
        rows={2}
        maxLength={160}
        value={text}
        placeholder="O que é este prato? Ex.: Arroz de pato à antiga"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() === saved.trim()) return;
          start(async () => {
            const r = await updatePhotoCaption(photo.id, text);
            if (r.ok) setSaved(text);
            onSaved(r);
          });
        }}
        className="w-full resize-none rounded-[2px] border border-line-2 bg-white px-3 py-2 text-[15px] text-ink outline-none focus:border-cobalt"
      />
      <span className="text-xs text-muted" aria-live="polite">
        {pending ? "A guardar…" : text.trim() !== saved.trim() ? "Por guardar" : saved ? "Guardado" : `${160 - text.length} caracteres`}
      </span>
    </label>
  );
}

type Props = { photos: ChefPhoto[]; userId: string | null; initials: string };

/** Profile photo and the dish gallery: upload, describe, order, pick the cover, delete. */
export function PhotoManager({ photos, userId, initials }: Props) {
  const { upload, uploading, message: uploadMessage } = usePhotoUpload(userId);
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const [, start] = useTransition();
  const gallery = photos.filter((p) => p.kind === "gallery");
  const [dishes, apply] = useOptimistic(gallery, reorder);
  const portrait = photos.find((p) => p.kind === "portrait") ?? photos.find((p) => p.kind === "selfie");

  function change(c: Change, run: () => Promise<ActionResult>) {
    setMessage(null);
    start(async () => {
      apply(c);
      const r = await run();
      if (!r.ok) setMessage({ ok: false, text: r.error });
    });
  }

  const onCaption = (r: ActionResult) => setMessage(r.ok ? null : { ok: false, text: r.error });

  return (
    <div className="flex flex-col gap-6">
      <FormMessage message={uploadMessage ?? message} />

      <section aria-labelledby="perfil-foto" className="box flex flex-wrap items-center gap-6 p-5 md:p-6">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-cobalt-soft">
          {portrait ? (
            <Photo photo={portrait.url} alt="A sua fotografia de perfil" sizes="112px" className="h-full w-full" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[34px] font-extrabold text-cobalt" aria-hidden="true">
              {initials}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
          <h2 id="perfil-foto" className="d m-0 text-2xl font-normal">
            Fotografia de perfil
          </h2>
          <p className="m-0 text-sm text-muted">
            Uma fotografia sua, de cara visível. Aparece no seu perfil público e ajuda a equipa a confirmar que é mesmo quem cozinha.
          </p>
          <div className="mt-1">
            <UploadButton
              kind="portrait"
              label={portrait ? "Trocar fotografia" : "Carregar fotografia"}
              busy={uploading}
              onFiles={upload}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="pratos" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="pratos" className="d m-0 text-2xl font-normal">
              Pratos · {dishes.length}
            </h2>
            <p className="m-0 max-w-[60ch] text-sm text-muted">
              Mostre o que cozinha e escreva o que é cada prato. A primeira fotografia é a capa nos resultados de pesquisa. São precisas
              pelo menos três para enviar o perfil para revisão.
            </p>
          </div>
          <UploadButton kind="gallery" label="Adicionar fotografias" busy={uploading} onFiles={upload} primary />
        </div>

        {dishes.length === 0 ? (
          <div className="box flex flex-col items-start gap-2 p-6">
            <span className="d text-xl">Ainda sem fotografias de pratos</span>
            <span className="text-sm text-muted">Boas fotografias, com luz natural, são o que mais faz um cliente pedir uma reserva.</span>
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((p, i) => (
              <li key={p.id} className="box flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] bg-paper">
                  <Photo
                    photo={p.url}
                    alt={p.caption ?? "Prato"}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="h-full w-full"
                  />
                  {i === 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[13px] font-semibold text-ink">
                      Capa
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <CaptionField key={p.id} photo={p} onSaved={onCaption} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {i > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-o"
                        onClick={() => change({ type: "move", id: p.id, to: "first" }, () => movePhoto(p.id, "first"))}
                      >
                        Usar como capa
                      </button>
                    )}
                    <button
                      type="button"
                      className="ctl !h-10 !w-10"
                      aria-label="Mover para trás"
                      disabled={i === 0}
                      onClick={() => change({ type: "move", id: p.id, to: -1 }, () => movePhoto(p.id, -1))}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="ctl !h-10 !w-10"
                      aria-label="Mover para a frente"
                      disabled={i === dishes.length - 1}
                      onClick={() => change({ type: "move", id: p.id, to: 1 }, () => movePhoto(p.id, 1))}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className="ml-auto cursor-pointer border-0 bg-transparent px-1 py-2 text-sm font-semibold text-danger"
                      onClick={() => {
                        if (window.confirm("Apagar esta fotografia?")) change({ type: "delete", id: p.id }, () => deletePhoto(p.id));
                      }}
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
