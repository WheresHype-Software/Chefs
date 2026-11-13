"use client";

import { useTranslations } from "next-intl";
import { AddressSearch } from "@/components/AddressSearch";
import { LumiSlot } from "@/components/dashboard/LumiCoach";
import { ProfileVerification, type VerificationPhotos } from "@/components/dashboard/ProfileVerification";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/NumberInput";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRouter } from "@/lib/i18n/navigation";
import { useProfileForm } from "@/hooks/useProfileForm";
import type { MyChef } from "@/lib/dashboard";
import { LANGUAGES } from "@/lib/languages";
import { slugify } from "@/lib/slug";
import { SITE_DOMAIN } from "@/lib/constants";

/**
 * Public profile details: name, link, tier, bio, base area and service radius.
 *
 * `next` turns it into the first step of the onboarding flow: only what the review needs, the
 * Instagram or site required, and saving moves on to `next` instead of staying put. The fields it
 * hides keep their values in the form and are saved as they are.
 */
export function ProfileDetails({ chef, minDeposit = 0, next }: { chef: MyChef | null; minDeposit?: number; next?: string }) {
  const t = useTranslations("dashboard.profile.form");
  const router = useRouter();
  const { form, set, areaQuery, typeArea, pickArea, save, busy, locating, message } = useProfileForm(chef, {
    requireSocial: Boolean(next),
    onSaved: next ? () => router.push(next) : undefined,
  });
  const full = !next;
  const social = (
    <>
      <Field label={t("instagram")}>
        <input maxLength={80} value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder={t("instagramPlaceholder")} />
      </Field>
      <Field label={t("site")}>
        <input type="url" maxLength={200} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
      </Field>
    </>
  );

  return (
    <form
      className="box flex min-w-0 flex-[3_1_460px] flex-col gap-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2 className="d m-0 text-2xl font-normal">{full ? t("yourPage") : t("aboutYou")}</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
        <Field label={t("displayName")} lumi="nome">
          <input
            required
            maxLength={80}
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            onBlur={() => !form.slug && set("slug", slugify(form.display_name))}
          />
        </Field>
        <Field label={t("link")} lumi="link" hint={`${SITE_DOMAIN}/chef/${form.slug || t("slugPlaceholder")}`}>
          <input
            required
            maxLength={60}
            value={form.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
            placeholder={t("slugPlaceholder")}
          />
        </Field>
        <Field label={t("appearAs")} lumi="aparecer" hint={t("appearHint")}>
          <select value={form.cook_form} onChange={(e) => set("cook_form", e.target.value as typeof form.cook_form)}>
            <option value="cozinheiro">{t("cook")}</option>
            <option value="cozinheira">{t("cookFemale")}</option>
          </select>
        </Field>
        <Field label={t("profileType")} lumi="perfil">
          <select value={form.tier} onChange={(e) => set("tier", e.target.value as MyChef["tier"])}>
            <option value="home">{form.cook_form === "cozinheira" ? t("homeCookFemale") : t("homeCook")}</option>
            <option value="professional">{t("professional")}</option>
          </select>
        </Field>
        <Field lumi="frase" className="col-span-full" label={t("headline")} hint={t("headlineHint")}>
          <input
            maxLength={80}
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder={t("headlinePlaceholder")}
          />
        </Field>
      </div>
      <Field label={t("bio")} lumi="bio">
        <textarea
          rows={4}
          maxLength={2000}
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder={t("bioPlaceholder")}
        />
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
        <LumiSlot name="zona" />
        <div className="field lab" data-lumi="zona">
          {t("baseArea")}
          <AddressSearch
            label={t("baseArea")}
            value={areaQuery}
            onChange={typeArea}
            onSelect={pickArea}
            placeholder={t("areaPlaceholder")}
            inputClassName="w-full"
          />
          <span className="hint">{t("areaHint")}</span>
        </div>
        <Field label={t("radius")} lumi="raio">
          <NumberInput min={1} max={100} emptyValue={10} value={form.service_radius_km} onChange={(v) => set("service_radius_km", v)} />
        </Field>
        {full && social}
        {full && (
          <>
            <Field label={t("years")}>
              <NumberInput min={0} max={70} value={form.years_experience} onChange={(v) => set("years_experience", v)} />
            </Field>
            <Field
              label={t("deposit")}
              hint={
                minDeposit > 0
                  ? (form.deposit_percent ?? 0) > 0 && (form.deposit_percent ?? 0) < minDeposit
                    ? t("depositTooLow", { min: minDeposit })
                    : t("depositHint", { min: minDeposit })
                  : t("depositHintNoMin")
              }
            >
              <NumberInput min={0} max={100} emptyValue={0} value={form.deposit_percent} onChange={(v) => set("deposit_percent", v)} />
            </Field>
          </>
        )}
      </div>
      {!full && <LumiSlot name="social" />}
      {!full && (
        <fieldset className="m-0 flex flex-col gap-3 rounded-[3px] border border-line-2 bg-paper p-4" data-lumi="social">
          <legend className="lab px-1">{t("socialLegend")}</legend>
          <p className="m-0 text-sm text-ink-3">{t("oneOfTwo")}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">{social}</div>
        </fieldset>
      )}
      {full && (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="field lab mb-2 p-0">{t("languages")}</legend>
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
          <span className="hint">{t("languagesHint")}</span>
        </fieldset>
      )}
      <FormMessage message={message} />
      <button type="submit" className="btn self-start" disabled={busy}>
        {locating ? t("locating") : next ? t("continue") : chef ? t("save") : t("create")}
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
