"use client";

import { AddressSearch } from "@/components/AddressSearch";
import { ProfileVerification, type VerificationPhotos } from "@/components/dashboard/ProfileVerification";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/NumberInput";
import { FormMessage } from "@/components/ui/FormMessage";
import { useProfileForm } from "@/hooks/useProfileForm";
import type { MyChef } from "@/lib/dashboard";
import { LANGUAGES } from "@/lib/languages";
import { slugify } from "@/lib/slug";
import { SITE_DOMAIN } from "@/lib/constants";

/** Public profile details: name, link, tier, bio, base area and service radius. */
function ProfileDetails({ chef, minDeposit }: { chef: MyChef | null; minDeposit: number }) {
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
        <Field label="Como quer aparecer" hint="Com certificado verificado, passa a aparecer como Chef.">
          <select value={form.cook_form} onChange={(e) => set("cook_form", e.target.value as typeof form.cook_form)}>
            <option value="cozinheiro">Cozinheiro</option>
            <option value="cozinheira">Cozinheira</option>
          </select>
        </Field>
        <Field label="Perfil">
          <select value={form.tier} onChange={(e) => set("tier", e.target.value as MyChef["tier"])}>
            <option value="home">{form.cook_form === "cozinheira" ? "Cozinheira caseira" : "Cozinheiro caseiro"}</option>
            <option value="professional">Profissional de cozinha</option>
          </select>
        </Field>
        <Field label="Uma frase para o seu perfil" hint="Aparece por baixo do seu nome. Até 80 caracteres.">
          <input
            maxLength={80}
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Cozinha alentejana para jantares em casa"
          />
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
        <Field
          label="Sinal pedido (%)"
          hint={
            minDeposit > 0
              ? (form.deposit_percent ?? 0) > 0 && (form.deposit_percent ?? 0) < minDeposit
                ? `Tem de ser pelo menos ${minDeposit}%.`
                : `O cliente paga-o na app. Mínimo ${minDeposit}%.`
              : "O cliente paga-o na app para confirmar a reserva."
          }
        >
          <NumberInput min={0} max={100} emptyValue={0} value={form.deposit_percent} onChange={(v) => set("deposit_percent", v)} />
        </Field>
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="field lab mb-2 p-0">Idiomas que fala (opcional)</legend>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map(([code, name]) => (
            <Chip
              key={code}
              pressed={form.languages.includes(code)}
              onClick={() =>
                set("languages", form.languages.includes(code) ? form.languages.filter((l) => l !== code) : [...form.languages, code])
              }
            >
              {name}
            </Chip>
          ))}
        </div>
        <span className="hint">Aparecem no seu perfil, para clientes que falam outras línguas.</span>
      </fieldset>
      <FormMessage message={message} />
      <button type="submit" className="btn self-start" disabled={busy}>
        {locating ? "A procurar a zona…" : chef ? "Guardar perfil" : "Criar perfil"}
      </button>
    </form>
  );
}

export function ProfileForm({
  chef,
  photos,
  minDeposit = 0,
}: {
  chef: MyChef | null;
  photos: VerificationPhotos;
  /** Smallest signal the platform accepts; 0 while payments are off. */
  minDeposit?: number;
}) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ProfileDetails chef={chef} minDeposit={minDeposit} />
      <ProfileVerification chef={chef} photos={photos} />
    </div>
  );
}
