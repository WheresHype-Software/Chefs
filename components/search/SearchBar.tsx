"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import { SERVICE_FILTERS, type ServiceFilter } from "@/lib/constants";
import { isoDay } from "@/lib/format";
import { searchHref, type SearchQuery } from "@/lib/search-params";

type Props = {
  initial?: Partial<SearchQuery>;
  /** "hero" is the large home-page bar; "compact" sits above results. */
  size?: "hero" | "compact";
};

const SERVICE_OPTIONS: [ServiceFilter, string][] = SERVICE_FILTERS.map(([key, label]) => [key, key === "all" ? "Tudo" : label]);

function Cell({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col justify-center gap-0.5 px-4 py-2.5 ${className}`}>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}

const inputClass = "w-full min-w-0 border-0 bg-transparent p-0 text-[16px] text-ink outline-none placeholder:text-faint";

/** Where / what / when, then go to the results page. */
export function SearchBar({ initial = {}, size = "hero" }: Props) {
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
    <form
      role="search"
      aria-label="Procurar chefs"
      onSubmit={submit}
      className={`grid w-full rounded-[12px] border border-line-2 bg-white shadow-[0_10px_30px_-12px_rgb(20_32_51/0.25)] md:grid-cols-[1.4fr_1.1fr_1fr_auto] md:items-stretch ${
        hero ? "p-1.5" : "p-1"
      }`}
    >
      <Cell label="Onde" className="border-b border-line md:border-b-0 md:border-r">
        <AddressSearch
          label="Morada ou bairro"
          value={where}
          onChange={(v) => {
            setWhere(v);
            setPlace(null);
          }}
          onSelect={setPlace}
          placeholder="Morada, bairro ou cidade"
          inputClassName={inputClass}
        />
      </Cell>
      <Cell label="O quê" className="border-b border-line md:border-b-0 md:border-r">
        <select
          aria-label="Tipo de serviço"
          value={service}
          onChange={(e) => setService(e.target.value as ServiceFilter)}
          className={`${inputClass} cursor-pointer`}
        >
          {SERVICE_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </Cell>
      <Cell label="Quando">
        <input
          type="date"
          aria-label="Data"
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
          {pending ? "A procurar…" : "Procurar"}
        </button>
      </div>
    </form>
  );
}
