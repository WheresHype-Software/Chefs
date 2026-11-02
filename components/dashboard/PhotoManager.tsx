"use client";

import { DishPhotoCard } from "@/components/dashboard/DishPhotoCard";
import { PhotoUploadButton } from "@/components/dashboard/PhotoUploadButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Photo } from "@/components/ui/Photo";
import { useDishPhotos } from "@/hooks/useDishPhotos";
import { usePhotoUpload, type UploadKind } from "@/hooks/usePhotoUpload";
import type { ChefPhoto } from "@/lib/dashboard";
import type { ActionResult } from "@/lib/result";

type UploadProps = { busy: boolean; onFiles: (kind: UploadKind, files: FileList | null) => void };

function ProfilePhoto({ portrait, initials, busy, onFiles }: UploadProps & { portrait: ChefPhoto | undefined; initials: string }) {
  return (
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
          <PhotoUploadButton kind="portrait" label={portrait ? "Trocar fotografia" : "Carregar fotografia"} busy={busy} onFiles={onFiles} />
        </div>
      </div>
    </section>
  );
}

type Props = { photos: ChefPhoto[]; userId: string | null; initials: string };

/** Profile photo and the dish gallery: upload, describe, order, pick the cover, delete. */
export function PhotoManager({ photos, userId, initials }: Props) {
  const { upload, uploading, message: uploadMessage } = usePhotoUpload(userId);
  const { dishes, message, setMessage, move, remove } = useDishPhotos(photos.filter((p) => p.kind === "gallery"));
  const portrait = photos.find((p) => p.kind === "portrait") ?? photos.find((p) => p.kind === "selfie");
  const onCaption = (r: ActionResult) => setMessage(r.ok ? null : { ok: false, text: r.error });

  return (
    <div className="flex flex-col gap-6">
      <FormMessage message={uploadMessage ?? message} />

      <ProfilePhoto portrait={portrait} initials={initials} busy={uploading} onFiles={upload} />

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
          <PhotoUploadButton kind="gallery" label="Adicionar fotografias" busy={uploading} onFiles={upload} primary />
        </div>

        {dishes.length === 0 ? (
          <div className="box flex flex-col items-start gap-2 p-6">
            <span className="d text-xl">Ainda sem fotografias de pratos</span>
            <span className="text-sm text-muted">Boas fotografias, com luz natural, são o que mais faz um cliente pedir uma reserva.</span>
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((p, i) => (
              <DishPhotoCard
                key={p.id}
                photo={p}
                index={i}
                isLast={i === dishes.length - 1}
                onMove={(to) => move(p.id, to)}
                onDelete={() => remove(p.id)}
                onCaptionSaved={onCaption}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
