"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { saveProfile } from "@/app/dashboard/actions/profile";
import type { Place } from "@/components/AddressSearch";
import { useServerAction } from "@/hooks/useServerAction";
import type { MyChef } from "@/lib/dashboard";
import { firstPlace } from "@/lib/geocode";
import { slugify } from "@/lib/slug";

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_DEPOSIT_PERCENT = 30;

function initialForm(chef: MyChef | null) {
  return {
    display_name: chef?.display_name ?? "",
    slug: chef?.slug ?? "",
    tier: chef?.tier ?? ("home" as MyChef["tier"]),
    cook_form: (chef?.badges.includes("cozinheira") ? "cozinheira" : "cozinheiro") as "cozinheiro" | "cozinheira",
    headline: chef?.headline ?? "",
    bio: chef?.bio ?? "",
    area_name: chef?.area_name ?? "",
    service_radius_km: Number(chef?.service_radius_km ?? DEFAULT_RADIUS_KM) as number | null,
    instagram: chef?.socials.instagram ?? "",
    website: chef?.socials.website ?? "",
    years_experience: chef?.years_experience ?? (null as number | null),
    deposit_percent: chef?.deposit_percent ?? (DEFAULT_DEPOSIT_PERCENT as number | null),
    languages: chef?.languages ?? ([] as string[]),
  };
}

type ProfileFormValues = ReturnType<typeof initialForm>;

/** "Alvalade, Lisboa" -> "Alvalade". */
const areaName = (label: string) => label.split(",")[0]!.trim();

type Options = {
  /** Runs after a successful save; the onboarding flow uses it to move to the next step. */
  onSaved?: () => void;
  /** Instagram or site is needed to send for review; onboarding asks for it up front. */
  requireSocial?: boolean;
};

/** State and save rules of the profile form: fields, the base-area search and its geocoding fallback. */
export function useProfileForm(chef: MyChef | null, { onSaved, requireSocial }: Options = {}) {
  const t = useTranslations("dashboard.profile");
  const [form, setForm] = useState(() => initialForm(chef));
  const [areaQuery, setAreaQuery] = useState(chef?.area_name ?? "");
  const [place, setPlace] = useState<Place | null>(
    chef?.lat && chef?.lng ? { label: chef.area_name ?? "", lat: chef.lat, lng: chef.lng } : null,
  );
  const [locating, setLocating] = useState(false);
  const { run, pending, message, setMessage } = useServerAction(saveProfile, {
    // In onboarding the save is silent: the next step appearing is the confirmation.
    successMessage: onSaved ? undefined : t("saved"),
    onSuccess: onSaved,
  });
  const set = <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Typing in the area field drops the picked place until a suggestion is chosen again. */
  function typeArea(value: string) {
    setAreaQuery(value);
    setPlace(null);
  }

  function pickArea(p: Place) {
    setPlace(p);
    set("area_name", areaName(p.label));
  }

  async function save() {
    if (requireSocial && !form.instagram.trim() && !form.website.trim()) {
      setMessage({ ok: false, text: t("needSocial") });
      return;
    }
    // Typed a zone without picking a suggestion: look it up instead of refusing.
    let base = place;
    if (!base && areaQuery.trim()) {
      setLocating(true);
      base = await firstPlace(areaQuery);
      setLocating(false);
      if (base) setPlace(base);
    }
    if (!base) {
      setMessage({ ok: false, text: t("areaNotFound") });
      return;
    }
    run({
      ...form,
      slug: form.slug || slugify(form.display_name),
      area_name: form.area_name || areaName(areaQuery),
      service_radius_km: form.service_radius_km ?? DEFAULT_RADIUS_KM,
      years_experience: form.years_experience ?? undefined,
      deposit_percent: form.deposit_percent ?? undefined,
      lat: base.lat,
      lng: base.lng,
    });
  }

  return { form, set, areaQuery, typeArea, pickArea, save, busy: pending || locating, locating, message };
}
