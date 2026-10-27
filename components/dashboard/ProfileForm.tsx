"use client";

import { useState } from "react";
import { saveProfile, submitForReview } from "@/app/dashboard/actions";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/NumberInput";
import { FormMessage } from "@/components/ui/FormMessage";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useServerAction } from "@/hooks/useServerAction";
import type { MyChef } from "@/lib/dashboard";
import { firstPlace } from "@/lib/geocode";
import { slugify } from "@/lib/slug";

type Photos = { selfie: number; gallery: number };

const STATUS_LABEL: Record<MyChef["status"], string> = {
  draft: "rascunho",
  pending: "em revisão",
  approved: "aprovado",
  rejected: "alterações pedidas",
  suspended: "suspenso",
};

function initialForm(chef: MyChef | null) {
  return {
    display_name: chef?.display_name ?? "",
    slug: chef?.slug ?? "",
    tier: chef?.tier ?? ("home" as MyChef["tier"]),
    headline: chef?.headline ?? "",
    bio: chef?.bio ?? "",
    area_name: chef?.area_name ?? "",
    service_radius_km: Number(chef?.service_radius_km ?? 10) as number | null,
    instagram: chef?.socials.instagram ?? "",
    website: chef?.socials.website ?? "",
    years_experience: chef?.years_experience ?? (null as number | null),
    deposit_percent: chef?.deposit_percent ?? (30 as number | null),
  };
}

/** Public profile details: name, link, tier, bio, base area and service radius. */
function ProfileDetails({ chef }: { chef: MyChef | null }) {
  const [form, setForm] = useState(() => initialForm(chef));
  const [areaQuery, setAreaQuery] = useState(chef?.area_name ?? "");
  const [place, setPlace] = useState<Place | null>(
    chef?.lat && chef?.lng ? { label: chef.area_name ?? "", lat: chef.lat, lng: chef.lng } : null,
  );
  const [locating, setLocating] = useState(false);
  const { run, pending, message, setMessage } = useServerAction(saveProfile, { successMessage: "Perfil guardado." });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    // Typed a zone without picking a suggestion: look it up instead of refusing.
    let base = place;
    if (!base && areaQuery.trim()) {
      setLocating(true);
      base = await firstPlace(areaQuery);
      setLocating(false);
      if (base) setPlace(base);
    }
    if (!base) {
      setMessage({ ok: false, text: 'Não encontrámos essa zona. Escreva o bairro e a cidade, por exemplo "Alvalade, Lisboa".' });
      return;
    }
    run({
      ...form,
      slug: form.slug || slugify(form.display_name),
      area_name: form.area_name || areaQuery.split(",")[0]!.trim(),
      service_radius_km: form.service_radius_km ?? 10,
      years_experience: form.years_experience ?? undefined,
      deposit_percent: form.deposit_percent ?? undefined,
      lat: base.lat,
      lng: base.lng,
    });
  }

  return (
    <form
      className="box flex min-w-0 flex-[3_1_460px] flex-col gap-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2 className="d m-0 text-2xl font-normal">A sua página</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Field label="Nome público">
          <input
            required
            maxLength={80}
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            onBlur={() => !form.slug && set("slug", slugify(form.display_name))}
          />
        </Field>
        <Field label="Link" hint={`aolume.pt/chef/${form.slug || "o-seu-nome"}`}>
          <input
            required
            maxLength={60}
            value={form.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
            placeholder="o-seu-nome"
          />
        </Field>
        <Field label="Perfil">
          <select value={form.tier} onChange={(e) => set("tier", e.target.value as MyChef["tier"])}>
            <option value="home">Cozinheiro caseiro</option>
            <option value="professional">Chef profissional</option>
          </select>
        </Field>
        <Field label="Especialidade (uma linha)">
          <input maxLength={80} value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Petiscos e eventos" />
        </Field>
      </div>
      <Field label="Sobre si">
        <textarea
          rows={4}
          maxLength={2000}
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="A sua história, o que cozinha, como trabalha."
        />
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="field lab">
          Zona de base
          <AddressSearch
            label="Zona de base"
            value={areaQuery}
            onChange={(v) => {
              setAreaQuery(v);
              setPlace(null);
            }}
            onSelect={(p) => {
              setPlace(p);
              set("area_name", p.label.split(",")[0]!.trim());
            }}
            placeholder="Bairro ou freguesia"
            inputClassName="w-full"
          />
          <span className="hint">Os clientes veem a zona, nunca a sua morada.</span>
        </div>
        <Field label="Raio de serviço (km)">
          <NumberInput min={1} max={100} emptyValue={10} value={form.service_radius_km} onChange={(v) => set("service_radius_km", v)} />
        </Field>
        <Field label="Instagram">
          <input maxLength={80} value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@o.seu.perfil" />
        </Field>
        <Field label="Site">
          <input type="url" maxLength={200} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Anos de experiência">
          <NumberInput min={0} max={70} value={form.years_experience} onChange={(v) => set("years_experience", v)} />
        </Field>
        <Field label="Sinal pedido (%)">
          <NumberInput min={0} max={100} emptyValue={0} value={form.deposit_percent} onChange={(v) => set("deposit_percent", v)} />
        </Field>
      </div>
      <FormMessage message={message} />
      <button type="submit" className="btn self-start" disabled={pending || locating}>
        {locating ? "A procurar a zona…" : chef ? "Guardar perfil" : "Criar perfil"}
      </button>
    </form>
  );
}

/** Checklist, photo uploads and "send for review". */
function Verification({ chef, photos, userId }: { chef: MyChef | null; photos: Photos; userId: string | null }) {
  const { upload, uploading, message: uploadMessage } = usePhotoUpload(userId);
  const submit = useServerAction(submitForReview, { successMessage: "Enviado para revisão. Respondemos por email." });
  const canSubmit = chef?.status === "draft" || chef?.status === "rejected";
  const checklist: [string, boolean][] = [
    ["Fotografia sua", photos.selfie > 0],
    ["Instagram ou site", Boolean(chef?.socials.instagram || chef?.socials.website)],
    [`Fotos de pratos (${photos.gallery}/3)`, photos.gallery >= 3],
  ];

  return (
    <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
      <div className="box flex flex-col gap-3 p-6">
        <h2 className="d m-0 text-2xl font-normal">Verificação</h2>
        <span className="text-sm text-muted">
          Uma fotografia sua, o Instagram ou site, e pelo menos três fotos de pratos. A equipa compara as fotos antes de o perfil ficar
          público.
        </span>
        <ul className="m-0 list-none border-t border-line p-0 text-sm">
          {checklist.map(([label, done]) => (
            <li key={label} className="flex justify-between border-b border-line py-2.5">
              <span>{label}</span>
              <span className={done ? "text-ok" : "text-muted"}>{done ? "Feito" : "Em falta"}</span>
            </li>
          ))}
        </ul>
        {chef && (
          <>
            <label className={`btn btn-sm btn-o cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
              {uploading ? "A carregar…" : "Carregar fotografia sua"}
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => upload("selfie", e.target.files)} />
            </label>
            <label className={`btn btn-sm btn-o cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
              Carregar fotos de pratos
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload("gallery", e.target.files)} />
            </label>
          </>
        )}
        <FormMessage message={uploadMessage} />
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

export function ProfileForm({ chef, photos, userId }: { chef: MyChef | null; photos: Photos; userId: string | null }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ProfileDetails chef={chef} />
      <Verification chef={chef} photos={photos} userId={userId} />
    </div>
  );
}
