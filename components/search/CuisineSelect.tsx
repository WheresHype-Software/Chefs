"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";

/** `value` is the stored (Portuguese) cuisine name, as in ?cozinha=; `label` is what people read. */
type Option = { value: string; label: string; href: string };

/** "Mais cozinhas": the full cuisine list as a native select, styled like the filter chips. */
export function CuisineSelect({ options, current }: { options: Option[]; current: string | null }) {
  const t = useTranslations("search.filters");
  const router = useRouter();
  const active = options.find((o) => o.value === current);
  return (
    <label className="chip relative" style={{ paddingRight: 34 }} aria-current={Boolean(active)}>
      <span>{active ? active.label : t("moreCuisines")}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="pointer-events-none absolute right-3.5">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <select
        aria-label={t("moreCuisines")}
        value={active ? active.value : ""}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) router.push(next.href, { scroll: false });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="" disabled>
          {t("moreCuisines")}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
