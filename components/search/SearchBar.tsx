"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useState, useTransition } from "react";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import { SERVICE_FILTERS, type ServiceFilter } from "@/lib/constants";
import { isoDay, serviceLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import { searchHref, type SearchQuery } from "@/lib/search-params";

type Props = {
  initial?: Partial<SearchQuery>;
  /** "hero" is the large home-page bar; "compact" sits above results. */
  size?: "hero" | "compact";
};

function Cell({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col justify-center gap-0.5 px-4 py-2.5 ${className}`}>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}

const inputClass = "w-full min-w-0 border-0 bg-transparent p-0 text-[16px] text-ink outline-none placeholder:text-muted";

/** Where / what / when, then go to the results page. */
export function SearchBar({ initial = {}, size = "hero" }: Props) {
  const t = useTranslations("search.bar");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [where, setWhere] = useState(initial.where ?? "");
  const [place, setPlace] = useState<Place | null>(
    initial.lat != null && initial.lng != null ? { label: initial.where ?? "", lat: initial.lat, lng: initial.lng } : null,
  );
  const [service, setService] = useState<ServiceFilter>(initial.service ?? "all");
  const [date, setDate] = useState(initial.date ?? "");
  const [pending, startTransition] = useTransition();
  const [today] = useState(() => isoDay(new Date()));
  const hero = size === "hero";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const href = searchHref({
      where: where.trim(),
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      service,
      cuisine: initial.cuisine ?? null,
      date: date || null,
    });
    startTransition(() => router.push(href));
  }

  return (
    <div className="@container w-full">
      <form
        role="search"
        aria-label={t("label")}
        onSubmit={submit}
        className={`grid w-full rounded-[12px] border border-line-2 bg-white shadow-[0_10px_30px_-12px_rgb(20_32_51/0.25)] @min-[640px]:grid-cols-[1.3fr_1fr_1.1fr_auto] @min-[640px]:items-stretch ${
          hero ? "p-1.5" : "p-1"
        }`}
      >
        <Cell label={t("where")} className="border-b border-line @min-[640px]:border-b-0 @min-[640px]:border-r">
          <AddressSearch
            label={t("whereLabel")}
            value={where}
            onChange={(v) => {
              setWhere(v);
              setPlace(null);
            }}
            onSelect={setPlace}
            placeholder={t("wherePlaceholder")}
            inputClassName={inputClass}
          />
        </Cell>
        <Cell label={t("what")} className="border-b border-line @min-[640px]:border-b-0 @min-[640px]:border-r">
          <select
            aria-label={t("serviceLabel")}
            value={service}
            onChange={(e) => setService(e.target.value as ServiceFilter)}
            className={`${inputClass} cursor-pointer`}
          >
            {SERVICE_FILTERS.map((key) => (
              <option key={key} value={key}>
                {key === "all" ? t("anything") : serviceLabel(key, locale)}
              </option>
            ))}
          </select>
        </Cell>
        <Cell label={t("when")}>
          <input
            type="date"
            aria-label={t("date")}
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} cursor-pointer`}
          />
        </Cell>
        <div className="p-1">
          <button type="submit" className={`btn h-full w-full ${hero ? "min-h-14 px-7 text-[16px]" : ""}`} disabled={pending}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            {pending ? t("submitting") : t("submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
