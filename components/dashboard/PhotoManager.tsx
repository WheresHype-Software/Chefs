"use client";

import { useMemo, useState } from "react";
import { DishPhotoCard } from "@/components/dashboard/DishPhotoCard";
import { LumiSlot } from "@/components/dashboard/LumiCoach";
import { PhotoUploadButton } from "@/components/dashboard/PhotoUploadButton";
import { PhotoZones } from "@/components/dashboard/PhotoZones";
import { FormMessage } from "@/components/ui/FormMessage";
import { Photo } from "@/components/ui/Photo";
import { useDishPhotos } from "@/hooks/useDishPhotos";
import { usePhotoUpload, type UploadKind } from "@/hooks/usePhotoUpload";
import type { ChefPhoto } from "@/lib/dashboard";
import type { ActionResult } from "@/lib/result";

type UploadProps = { busy: boolean; onFiles: (kind: UploadKind, files: FileList | null) => void };

function ProfilePhoto({ portrait, initials, busy, onFiles }: UploadProps & { portrait: ChefPhoto | undefined; initials: string }) {
  return (
    <section
      id="zona-perfil"
      aria-labelledby="perfil-foto"
      data-lumi="retrato"
      className="box scroll-mt-36 md:scroll-mt-24 flex flex-wrap items-center gap-6 p-5 md:p-6"
    >
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
        <p className="m-0 text-sm text-muted">Uma fotografia sua, de cara visível. É a que os clientes veem no seu perfil público.</p>
        <div className="mt-1">
          <PhotoUploadButton kind="portrait" label={portrait ? "Trocar fotografia" : "Carregar fotografia"} busy={busy} onFiles={onFiles} />
        </div>
      </div>
    </section>
  );
}

const SELFIE_STEPS = [
  "Tire uma selfie agora, de frente, com a cara bem visível e boa luz. Sem óculos de sol nem filtros.",
  "A equipa compara-a com a sua fotografia de perfil, para confirmar que é a mesma pessoa.",
  "Se não estiver nítida, pedimos-lhe outra por email. Pode trocá-la aqui quando quiser.",
  "Quando o perfil é aprovado, a selfie é apagada. Não fica guardada.",
];

/** The private selfie the team compares with the profile photo, and what happens to it. */
function VerificationSelfie({ selfie, approved, busy, onFiles }: UploadProps & { selfie: ChefPhoto | undefined; approved: boolean }) {
  return (
    <section
      id="zona-selfie"
      aria-labelledby="selfie"
      data-lumi="selfie"
      className="box scroll-mt-36 md:scroll-mt-24 flex flex-wrap items-start gap-6 p-5 md:p-6"
    >
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-paper text-center text-[13px] text-muted">
        {selfie?.url ? (
          // A short-lived private link, so a plain img rather than the optimised public Photo.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selfie.url} alt="A sua selfie de verificação" className="h-full w-full object-cover" />
        ) : approved ? (
          <span className="px-2 font-semibold text-ok">Verificado</span>
        ) : (
          <span className="px-2">Ainda sem selfie</span>
        )}
      </div>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="selfie" className="d m-0 text-2xl font-normal">
            Selfie de verificação
          </h2>
          <span className="rounded-full bg-paper px-2.5 py-1 text-[12px] font-semibold text-ink-3">Privada · só a equipa vê</span>
        </div>
        {approved && !selfie ? (
          <p className="m-0 text-sm text-muted">
            A sua identidade foi confirmada e a selfie já foi apagada. Não precisa de fazer mais nada.
          </p>
        ) : (
          <>
            <ol className="m-0 flex flex-col gap-1.5 pl-5 text-sm text-ink-3">
              {SELFIE_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="mt-1">
              <PhotoUploadButton kind="selfie" label={selfie ? "Tirar outra selfie" : "Tirar selfie"} busy={busy} onFiles={onFiles} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

type Props = { photos: ChefPhoto[]; userId: string | null; initials: string; approved: boolean };

/** Profile photo and the dish gallery: upload, describe, order, pick the cover, delete. */
export function PhotoManager({ photos, userId, initials, approved }: Props) {
  // Photos that have been saved but that this page has not been re-rendered to include yet.
  const [justAdded, setJustAdded] = useState<ChefPhoto[]>([]);
  const {
    upload,
    uploading,
    progress,
    message: uploadMessage,
  } = usePhotoUpload(userId, (photo) => setJustAdded((list) => [...list, photo]));

  const gallery = useMemo(() => {
    const server = photos.filter((p) => p.kind === "gallery");
    const known = new Set(server.map((p) => p.url));
    // Once the server knows about one, its own copy wins and the local one drops out.
    return [...server, ...justAdded.filter((p) => !known.has(p.url))];
  }, [photos, justAdded]);

  const { dishes, message, setMessage, move, remove } = useDishPhotos(gallery);
  const portrait = justAdded.findLast((p) => p.kind === "portrait") ?? photos.find((p) => p.kind === "portrait");
  const selfie = photos.find((p) => p.kind === "selfie");
  const onCaption = (r: ActionResult) => setMessage(r.ok ? null : { ok: false, text: r.error });

  return (
    <div className="flex flex-col gap-6">
      <PhotoZones
        zones={[
          { id: "zona-perfil", label: "Perfil", done: Boolean(portrait), status: portrait ? "Feita" : "Em falta" },
          {
            id: "zona-selfie",
            label: "Verificação",
            done: Boolean(selfie) || approved,
            status: approved ? "Verificado" : selfie ? "Enviada" : "Em falta",
          },
          {
            id: "zona-pratos",
            label: "Pratos",
            done: dishes.length >= 3,
            status: dishes.length >= 3 ? `${dishes.length} fotografias` : `${dishes.length} de 3`,
          },
        ]}
      />
      <FormMessage message={uploadMessage ?? message} />

      <LumiSlot name="retrato" />
      <ProfilePhoto portrait={portrait} initials={initials} busy={uploading} onFiles={upload} />
      <LumiSlot name="selfie" />
      <VerificationSelfie selfie={selfie} approved={approved} busy={uploading} onFiles={upload} />

      <LumiSlot name="pratos" />
      <section id="zona-pratos" aria-labelledby="pratos" data-lumi="pratos" className="scroll-mt-36 md:scroll-mt-24 flex flex-col gap-4">
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
          <PhotoUploadButton kind="gallery" label="Adicionar fotografias" busy={uploading} progress={progress} onFiles={upload} primary />
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
