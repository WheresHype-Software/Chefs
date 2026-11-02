"use client";

import { AddressSearch } from "@/components/AddressSearch";
import { ProfileVerification, type VerificationPhotos } from "@/components/dashboard/ProfileVerification";
import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/NumberInput";
import { FormMessage } from "@/components/ui/FormMessage";
import { useProfileForm } from "@/hooks/useProfileForm";
import type { MyChef } from "@/lib/dashboard";
import { slugify } from "@/lib/slug";
import { SITE_DOMAIN } from "@/lib/constants";

/** Public profile details: name, link, tier, bio, base area and service radius. */
function ProfileDetails({ chef }: { chef: MyChef | null }) {
  const { form, set, areaQuery, typeArea, pickArea, save, busy, locating, message } = useProfileForm(chef);

  return (
    <form
      className="box flex min-w-0 flex-[3_1_460px] flex-col gap-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2 className="d m-0 text-2xl font-normal">A sua página</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
        <Field label="Nome público">
          <input
            required
            maxLength={80}
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            onBlur={() => !form.slug && set("slug", slugify(form.display_name))}
          />
        </Field>
        <Field label="Link" hint={`${SITE_DOMAIN}/chef/${form.slug || "o-seu-nome"}`}>
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
        <div className="field lab">
          Zona de base
          <AddressSearch
            label="Zona de base"
            value={areaQuery}
            onChange={typeArea}
            onSelect={pickArea}
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
      <button type="submit" className="btn self-start" disabled={busy}>
        {locating ? "A procurar a zona…" : chef ? "Guardar perfil" : "Criar perfil"}
      </button>
    </form>
  );
}

export function ProfileForm({ chef, photos }: { chef: MyChef | null; photos: VerificationPhotos }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ProfileDetails chef={chef} />
      <ProfileVerification chef={chef} photos={photos} />
    </div>
  );
}
