"use client";

import { useState } from "react";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import { Chip } from "@/components/ui/Chip";
import { CUISINES, SERVICE_FILTERS, type ServiceFilter } from "@/lib/constants";

type Props = {
  count: number;
  place: Place | null;
  service: ServiceFilter;
  cuisine: string;
  onPlace: (place: Place | null) => void;
  onService: (service: ServiceFilter) => void;
  onCuisine: (cuisine: string) => void;
};

/** Floating search card: address, service chips and cuisine filter. */
export function MapSearchCard({ count, place, service, cuisine, onPlace, onService, onCuisine }: Props) {
  const [query, setQuery] = useState("");
  return (
    <div className="al-in absolute left-2.5 right-2.5 top-[70px] z-[4] box-border flex flex-col gap-4 rounded-[3px] border border-line bg-white p-[26px] md:left-4 md:right-auto md:top-24 md:w-[400px]">
      <span className="lab hidden text-muted md:block">
        {place ? place.label.split(",")[0] : "Lisboa"} · {count} {count === 1 ? "chef disponível" : "chefs disponíveis"}
      </span>
      <h1 className="d m-0 text-[30px] leading-[1.02] md:text-[44px]">Um chef perto de si.</h1>
      <AddressSearch
        label="Morada"
        icon
        value={query}
        onChange={(v) => {
          setQuery(v);
          if (!v) onPlace(null);
        }}
        onSelect={onPlace}
        placeholder="A sua morada ou bairro"
        className="border-b border-line-2 pb-2.5 pt-1.5"
        inputClassName="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink outline-none"
      />
      <div
        className="-mr-3.5 flex flex-nowrap gap-1.5 overflow-x-auto pr-3.5 [scrollbar-width:none] md:mr-0 md:flex-wrap md:pr-0"
        role="group"
        aria-label="Tipo de serviço"
      >
        {SERVICE_FILTERS.map(([key, label]) => (
          <Chip key={key} pressed={service === key} onClick={() => onService(key)}>
            {label}
          </Chip>
        ))}
      </div>
      <label className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="lab text-muted">Cozinha</span>
        <select
          value={cuisine}
          onChange={(e) => onCuisine(e.target.value)}
          className="min-h-[38px] max-w-[240px] flex-auto rounded-[2px] border border-line-2 bg-white px-2.5 text-sm text-ink"
        >
          <option value="all">Todas as cozinhas</option>
          {CUISINES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
