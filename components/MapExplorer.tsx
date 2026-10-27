"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import { BookingPanel } from "@/components/BookingPanel";
import { ChefMap, type ChefMapHandle } from "@/components/ChefMap";
import { SiteHeaderFloating } from "@/components/SiteChrome";
import { fromPrice, rating, tierLabel, toneFor } from "@/lib/format";
import type { ChefCard, ServiceType } from "@/lib/types";

const FILTERS: [ServiceType | "all", string][] = [
  ["all", "Todos"],
  ["home", "Chef em casa"],
  ["meal_prep", "Marmitas"],
  ["delivery", "Entrega"],
  ["pickup", "Levantamento"],
  ["events", "Eventos"],
];

const CUISINES = [
  "Portuguesa", "Petiscos", "Marisco e peixe", "Grelhados", "Cozinha de autor", "Mediterrânica",
  "Vegetariana", "Vegan", "Saudável", "Pastelaria", "Brasileira", "Asiática",
];

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function MapExplorer({ chefs, filter: initialFilter }: { chefs: ChefCard[]; filter?: ServiceType | "all" }) {
  const map = useRef<ChefMapHandle>(null);
  const [filter, setFilter] = useState<ServiceType | "all">(initialFilter ?? "all");
  const [cuisine, setCuisine] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [flat, setFlat] = useState(false);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 761px)");
    const set = () => setWide(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // Follow the ?servico= link from the service list without an effect.
  const [lastInitial, setLastInitial] = useState(initialFilter);
  if (initialFilter !== lastInitial) {
    setLastInitial(initialFilter);
    if (initialFilter) setFilter(initialFilter);
  }

  const visibleList = useMemo(
    () =>
      chefs.filter(
        (c) =>
          (filter === "all" || c.services.includes(filter)) &&
          (cuisine === "all" || c.categories.includes(cuisine)) &&
          (!place || km(place, c) <= Number(c.radiusKm)),
      ),
    [chefs, filter, cuisine, place],
  );
  const visible = useMemo(() => new Set(visibleList.map((c) => c.id)), [visibleList]);
  const chef = chefs.find((c) => c.id === selected) ?? null;
  const open = Boolean(chef);

  function pick(id: string) {
    setSelected(id);
    setTouched(true);
  }

  return (
    <section id="mapa" aria-label="Mapa de chefs" className="relative h-[740px] overflow-hidden md:h-[880px]">
      <ChefMap
        ref={map}
        chefs={chefs}
        visible={visible}
        selectedId={selected}
        onPick={pick}
        onInteract={() => setTouched(true)}
        home={place}
        padRight={open && wide ? 470 : 0}
      />

      <SiteHeaderFloating />

      <div className="al-in absolute left-2.5 right-2.5 top-[70px] z-[4] box-border flex flex-col gap-4 overflow-visible rounded-[3px] border border-line bg-white p-[26px] md:left-4 md:right-auto md:top-24 md:w-[400px]">
        <span className="lab hidden text-muted md:block">
          {place ? place.label.split(",")[0] : "Lisboa"} · {visibleList.length} {visibleList.length === 1 ? "chef disponível" : "chefs disponíveis"}
        </span>
        <h1 className="d m-0 text-[30px] leading-[1.02] md:text-[44px]">Um chef perto de si.</h1>
        <AddressSearch
          label="Morada"
          icon
          value={query}
          onChange={(v) => {
            setQuery(v);
            if (!v) setPlace(null);
          }}
          onSelect={(p) => {
            setPlace(p);
            setTouched(true);
            map.current?.flyTo(p.lng, p.lat, 13);
          }}
          placeholder="A sua morada ou bairro"
          className="border-b border-ink pt-1.5 pb-2.5"
          inputClassName="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink outline-none"
        />
        <div
          className="-mr-3.5 flex flex-nowrap gap-1.5 overflow-x-auto pr-3.5 [scrollbar-width:none] md:mr-0 md:flex-wrap md:pr-0"
          role="group"
          aria-label="Tipo de serviço"
        >
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={filter === k}
              onClick={() => {
                setFilter(k);
                setTouched(true);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="lab text-muted">Cozinha</span>
          <select
            value={cuisine}
            onChange={(e) => {
              setCuisine(e.target.value);
              setTouched(true);
            }}
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

      <div className="absolute bottom-[212px] right-2.5 z-[4] flex flex-col gap-1.5 md:bottom-auto md:right-4 md:top-24">
        <button type="button" className="ctl" onClick={() => map.current?.zoomIn()} aria-label="Aproximar">
          +
        </button>
        <button type="button" className="ctl" onClick={() => map.current?.zoomOut()} aria-label="Afastar">
          −
        </button>
        <button
          type="button"
          className="ctl !text-[11px] font-semibold tracking-[.08em]"
          onClick={() => setFlat(map.current?.toggle3d() ?? false)}
          aria-label="Alternar vista 2D e 3D"
        >
          {flat ? "3D" : "2D"}
        </button>
        <button type="button" className="ctl" onClick={() => map.current?.recenter()} aria-label="Centrar mapa">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111110" strokeWidth="1.6" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>

      {!touched && (
        <span className="lab pointer-events-none absolute bottom-[226px] left-1/2 z-[3] hidden -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-ink px-4 py-[11px] text-white md:block">
          Arraste para explorar · toque num chef
        </span>
      )}

      <div
        className={`absolute bottom-2.5 left-2.5 right-2.5 z-[4] flex gap-2.5 overflow-x-auto pb-1 transition-[right] duration-[600ms] [scrollbar-width:none] md:bottom-4 md:left-4 ${open ? "md:right-[472px]" : "md:right-4"}`}
      >
        {visibleList.length === 0 && (
          <div className="box flex-[0_0_300px] p-4 text-sm text-muted">
            Ainda não há chefs para esta pesquisa. Experimente outro tipo de serviço ou outra morada.
          </div>
        )}
        {visibleList.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === selected}
            onClick={() => pick(c.id)}
            className="flex flex-[0_0_260px] cursor-pointer gap-3.5 rounded-[3px] border border-line bg-white p-2.5 text-left text-ink transition hover:-translate-y-[3px] hover:border-ink aria-pressed:border-ink md:flex-[0_0_300px]"
          >
            <span className="flex h-[150px] flex-[0_0_88px] items-end overflow-hidden rounded-[2px] p-2" style={{ background: toneFor(c.id) }}>
              {c.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] uppercase tracking-[.12em] text-muted">Foto</span>
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-[3px] py-1 pr-1">
              <span className="lab text-muted">{tierLabel(c.tier, c.isNew, c.reviewCount, c.rating)}</span>
              <span className="d text-[22px] leading-[1.1]">{c.name}</span>
              <span className="text-[13px] text-muted">
                {c.categories.join(" · ")} · {c.area}
              </span>
              <span className="num mt-auto text-[13px]">
                <strong className="font-semibold">{rating(c.rating, c.reviewCount)}</strong> · desde {fromPrice(c.offers)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <aside
        aria-label="Chef selecionado"
        className={`fixed bottom-0 left-0 right-0 z-[7] h-[90dvh] md:absolute overflow-y-auto rounded-t-xl border border-b-0 border-line bg-white shadow-[0_30px_80px_rgba(17,17,16,.14)] transition-transform duration-[650ms] ease-[cubic-bezier(.2,.8,.2,1)] md:bottom-4 md:left-auto md:right-4 md:top-4 md:h-auto md:max-h-none md:w-[440px] md:max-w-[calc(100%-32px)] md:rounded-[3px] md:border-b ${
          open ? "translate-x-0 translate-y-0" : "translate-y-[105%] md:translate-x-[calc(100%+40px)] md:translate-y-0"
        }`}
      >
        <span className="sticky top-0 z-[2] block h-[22px] bg-white md:hidden" aria-hidden="true">
          <span className="mx-auto mt-2.5 block h-1 w-10 rounded bg-line-3" />
        </span>
        {chef && <BookingPanel key={chef.id} chef={chef} initialAddress={place} onClose={() => setSelected(null)} />}
      </aside>
    </section>
  );
}

export function ServiceList({ onPickHref }: { onPickHref?: boolean }) {
  const services: [ServiceType, string, string][] = [
    ["home", "Chef em casa", "Jantares e datas especiais, cozinhados e servidos na sua cozinha."],
    ["meal_prep", "Marmitas da semana", "Refeições caseiras para os dias de trabalho, entregues ou para levantar."],
    ["delivery", "Entrega", "Pratos do chef levados até à sua porta."],
    ["pickup", "Pastelaria e levantamento", "Bolos de aniversário, tartes e doces de época por encomenda."],
    ["events", "Eventos", "Aniversários, batizados e jantares de empresa, com orçamento à medida."],
  ];
  return (
    <div className="min-w-0 flex-[2_1_520px] border-t border-ink">
      {services.map(([k, title, text]) => (
        <Link
          key={k}
          href={onPickHref ? `/?servico=${k}#mapa` : "#mapa"}
          scroll={false}
          className="al-rv flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line py-[26px] text-ink no-underline transition-[padding] duration-300 hover:pl-3"
        >
          <span className="d text-[clamp(26px,4vw,36px)] leading-[1.1]">{title}</span>
          <span className="max-w-[360px] text-[15px] text-muted">{text}</span>
        </Link>
      ))}
    </div>
  );
}
