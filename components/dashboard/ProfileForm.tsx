"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPhoto, saveProfile, submitForReview } from "@/app/dashboard/actions";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import type { MyChef } from "@/lib/dashboard";
import { createClient, hasSupabase } from "@/lib/supabase/client";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProfileForm({ chef, photos, userId }: { chef: MyChef | null; photos: { selfie: number; gallery: number }; userId: string | null }) {
  const router = useRouter();
  const [f, setF] = useState({
    display_name: chef?.display_name ?? "",
    slug: chef?.slug ?? "",
    tier: chef?.tier ?? ("home" as "home" | "professional"),
    headline: chef?.headline ?? "",
    bio: chef?.bio ?? "",
    area_name: chef?.area_name ?? "",
    service_radius_km: Number(chef?.service_radius_km ?? 10),
    instagram: chef?.socials.instagram ?? "",
    website: chef?.socials.website ?? "",
    years_experience: chef?.years_experience ?? undefined,
    deposit_percent: chef?.deposit_percent ?? 30,
  });
  const [areaQuery, setAreaQuery] = useState(chef?.area_name ?? "");
  const [place, setPlace] = useState<Place | null>(chef?.lat && chef?.lng ? { label: chef.area_name ?? "", lat: chef.lat, lng: chef.lng } : null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function save() {
    setMsg(null);
    if (!place) return setMsg({ ok: false, text: "Escolha a sua zona na lista para o colocarmos no mapa." });
    start(async () => {
      const r = await saveProfile({
        ...f,
        slug: f.slug || slugify(f.display_name),
        area_name: f.area_name || areaQuery.split(",")[0]!.trim(),
        lat: place.lat,
        lng: place.lng,
        years_experience: f.years_experience ? Number(f.years_experience) : undefined,
      });
      setMsg(r.ok ? { ok: true, text: "Perfil guardado." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  }

  async function upload(kind: "selfie" | "gallery", files: FileList | null) {
    if (!files?.length || !userId || !hasSupabase) return;
    setMsg(null);
    const sb = createClient();
    for (const file of Array.from(files).slice(0, 8)) {
      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
        setMsg({ ok: false, text: "Use imagens até 8 MB." });
        continue;
      }
      const path = `${userId}/${kind}-${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error } = await sb.storage.from("chef-photos").upload(path, file, { cacheControl: "31536000" });
      if (error) {
        setMsg({ ok: false, text: error.message });
        continue;
      }
      const url = sb.storage.from("chef-photos").getPublicUrl(path).data.publicUrl;
      await addPhoto(url, kind);
    }
    router.refresh();
  }

  const canSubmit = chef && (chef.status === "draft" || chef.status === "rejected");

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        className="box flex min-w-0 flex-[3_1_460px] flex-col gap-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <span className="d text-2xl">A sua página</span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <label className="field lab">
            Nome público
            <input required value={f.display_name} onChange={(e) => set("display_name", e.target.value)} onBlur={() => !f.slug && set("slug", slugify(f.display_name))} />
          </label>
          <label className="field lab">
            Link
            <input required value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="o-seu-nome" />
            <span className="hint">aolume.pt/chef/{f.slug || "o-seu-nome"}</span>
          </label>
          <label className="field lab">
            Perfil
            <select value={f.tier} onChange={(e) => set("tier", e.target.value as "home" | "professional")}>
              <option value="home">Cozinheiro caseiro</option>
              <option value="professional">Chef profissional</option>
            </select>
          </label>
          <label className="field lab">
            Especialidade (uma linha)
            <input value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Petiscos e eventos" />
          </label>
        </div>
        <label className="field lab">
          Sobre si
          <textarea rows={4} value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="A sua história, o que cozinha, como trabalha." />
        </label>
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
            <span className="hint">No mapa aparece a zona, nunca a sua morada.</span>
          </div>
          <label className="field lab">
            Raio de serviço (km)
            <input inputMode="numeric" value={f.service_radius_km} onChange={(e) => set("service_radius_km", Number(e.target.value) || 1)} />
          </label>
          <label className="field lab">
            Instagram
            <input value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@o.seu.perfil" />
          </label>
          <label className="field lab">
            Site
            <input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </label>
          <label className="field lab">
            Anos de experiência
            <input inputMode="numeric" value={f.years_experience ?? ""} onChange={(e) => set("years_experience", e.target.value ? Number(e.target.value) : undefined)} />
          </label>
          <label className="field lab">
            Sinal pedido (%)
            <input inputMode="numeric" value={f.deposit_percent} onChange={(e) => set("deposit_percent", Number(e.target.value) || 0)} />
          </label>
        </div>
        {msg && (
          <p role="status" className={`m-0 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" className="btn self-start" disabled={pending}>
          {chef ? "Guardar perfil" : "Criar perfil"}
        </button>
      </form>

      <aside className="flex min-w-0 flex-[2_1_300px] flex-col gap-3.5">
        <div className="box flex flex-col gap-3 p-6">
          <span className="d text-2xl">Verificação</span>
          <span className="text-sm text-muted">
            Uma fotografia sua, o Instagram ou site, e pelo menos três fotos de pratos. A equipa compara as fotos antes de o perfil entrar no mapa.
          </span>
          <ul className="m-0 list-none border-t border-line p-0 text-sm">
            {[
              ["Fotografia sua", photos.selfie > 0],
              ["Instagram ou site", Boolean(chef?.socials.instagram || chef?.socials.website)],
              [`Fotos de pratos (${photos.gallery}/3)`, photos.gallery >= 3],
            ].map(([k, ok]) => (
              <li key={String(k)} className="flex justify-between border-b border-line py-2.5">
                <span>{k}</span>
                <span className={ok ? "text-ok" : "text-muted"}>{ok ? "Feito" : "Em falta"}</span>
              </li>
            ))}
          </ul>
          {chef && (
            <>
              <label className="btn btn-sm btn-o cursor-pointer">
                Carregar fotografia sua
                <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => upload("selfie", e.target.files)} />
              </label>
              <label className="btn btn-sm btn-o cursor-pointer">
                Carregar fotos de pratos
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload("gallery", e.target.files)} />
              </label>
            </>
          )}
          <span className="lab mt-2 text-muted">
            Estado:{" "}
            {{ draft: "rascunho", pending: "em revisão", approved: "aprovado", rejected: "alterações pedidas", suspended: "suspenso" }[chef?.status ?? "draft"]}
          </span>
          {chef?.status === "rejected" && chef.verification_notes && <span className="text-sm text-danger">{chef.verification_notes}</span>}
          {canSubmit && (
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await submitForReview();
                  setMsg(r.ok ? { ok: true, text: "Enviado para revisão. Respondemos por email." } : { ok: false, text: r.error });
                  router.refresh();
                })
              }
            >
              Enviar para revisão
            </button>
          )}
          <span className="text-xs text-muted">
            Ao enviar, aceita os termos para chefs: é responsável pela legalidade, higiene, impostos e pagamentos do seu serviço.
          </span>
        </div>
      </aside>
    </div>
  );
}
