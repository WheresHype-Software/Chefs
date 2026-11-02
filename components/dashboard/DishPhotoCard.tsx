"use client";

import { useState, useTransition } from "react";
import { updatePhotoCaption } from "@/app/dashboard/actions/photos";
import { Photo } from "@/components/ui/Photo";
import type { PhotoMove } from "@/hooks/useDishPhotos";
import { callAction } from "@/lib/call-action";
import type { ChefPhoto } from "@/lib/dashboard";
import type { ActionResult } from "@/lib/result";

const CAPTION_MAX = 160;

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
        maxLength={CAPTION_MAX}
        value={text}
        placeholder="O que é este prato? Ex.: Arroz de pato à antiga"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() === saved.trim()) return;
          start(async () => {
            const r = await callAction(() => updatePhotoCaption(photo.id, text));
            if (r.ok) setSaved(text);
            onSaved(r);
          });
        }}
        className="w-full resize-none rounded-[2px] border border-line-2 bg-white px-3 py-2 text-[15px] text-ink outline-none focus:border-cobalt"
      />
      <span className="text-xs text-muted" aria-live="polite">
        {pending
          ? "A guardar…"
          : text.trim() !== saved.trim()
            ? "Por guardar"
            : saved
              ? "Guardado"
              : `${CAPTION_MAX - text.length} caracteres`}
      </span>
    </label>
  );
}

type Props = {
  photo: ChefPhoto;
  /** Position in the gallery; the first photo is the cover. */
  index: number;
  isLast: boolean;
  onMove: (to: PhotoMove) => void;
  onDelete: () => void;
  onCaptionSaved: (r: ActionResult) => void;
};

/** One dish photo: the picture, its caption and the order/cover/delete controls. */
export function DishPhotoCard({ photo, index, isLast, onMove, onDelete, onCaptionSaved }: Props) {
  return (
    <li className="box flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-paper">
        <Photo
          photo={photo.url}
          alt={photo.caption ?? "Prato"}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="h-full w-full"
        />
        {index === 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[13px] font-semibold text-ink">Capa</span>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <CaptionField key={photo.id} photo={photo} onSaved={onCaptionSaved} />
        <div className="flex flex-wrap items-center gap-1.5">
          {index > 0 && (
            <button type="button" className="btn btn-sm btn-o" onClick={() => onMove("first")}>
              Usar como capa
            </button>
          )}
          <button type="button" className="ctl !h-10 !w-10" aria-label="Mover para trás" disabled={index === 0} onClick={() => onMove(-1)}>
            ←
          </button>
          <button type="button" className="ctl !h-10 !w-10" aria-label="Mover para a frente" disabled={isLast} onClick={() => onMove(1)}>
            →
          </button>
          <button
            type="button"
            className="ml-auto cursor-pointer border-0 bg-transparent px-1 py-2 text-sm font-semibold text-danger"
            onClick={() => {
              if (window.confirm("Apagar esta fotografia?")) onDelete();
            }}
          >
            Apagar
          </button>
        </div>
      </div>
    </li>
  );
}
