"use client";

import { useRouter } from "next/navigation";

type Option = { label: string; href: string };

/** "Mais cozinhas": the full cuisine list as a native select, styled like the filter chips. */
export function CuisineSelect({ options, current }: { options: Option[]; current: string | null }) {
  const router = useRouter();
  const active = options.some((o) => o.label === current);
  return (
    <label className="chip relative" style={{ paddingRight: 34 }} aria-current={active}>
      <span>{active ? current : "Mais cozinhas"}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="pointer-events-none absolute right-3.5">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <select
        aria-label="Mais cozinhas"
        value={active ? current! : ""}
        onChange={(e) => {
          const next = options.find((o) => o.label === e.target.value);
          if (next) router.push(next.href, { scroll: false });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="" disabled>
          Mais cozinhas
        </option>
        {options.map((o) => (
          <option key={o.label} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
