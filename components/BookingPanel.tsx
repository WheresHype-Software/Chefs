"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { loadCalendar, requestBooking } from "@/app/actions";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import { MonthCalendar } from "@/components/MonthCalendar";
import { dayLabel, euro, firstName, MODE_LABEL, offerPriceLabel, rating, tierLabel, toneFor, unitTitle } from "@/lib/format";
import type { Calendar, ChefCard } from "@/lib/types";

type Props = {
  chef: ChefCard;
  onClose?: () => void;
  initialAddress?: Place | null;
  /** "embedded" drops the cover and chef intro, for use on the chef's own page. */
  variant?: "panel" | "embedded";
  initialOfferId?: string;
};

export function BookingPanel({ chef, onClose, initialAddress, variant = "panel", initialOfferId }: Props) {
  const embedded = variant === "embedded";
  const now = new Date();
  const [offerIdx, setOfferIdx] = useState(
    Math.max(
      0,
      chef.offers.findIndex((o) => o.id === initialOfferId),
    ),
  );
  const offer = chef.offers[offerIdx]!;
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  // Calendar for the visible month; stale while the next month loads.
  const calKey = `${chef.id}:${ym.y}-${ym.m}`;
  const [cal, setCal] = useState<{ key: string; data: Calendar } | null>(null);
  const calendar = cal?.key === calKey ? cal.data : null;
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(Math.max(offer.minGuests, offer.unit === "pessoa" ? 4 : 1));
  const [address, setAddress] = useState(initialAddress?.label ?? "");
  const [place, setPlace] = useState<Place | null>(initialAddress ?? null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ ref: string; link: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    loadCalendar(chef.id, ym.y, ym.m)
      .then((data) => live && setCal({ key: calKey, data }))
      .catch(() => live && setCal({ key: calKey, data: { available: [], booked: [] } }));
    return () => {
      live = false;
    };
  }, [chef.id, ym.y, ym.m, calKey]);

  function chooseOffer(k: number) {
    const o = chef.offers[k]!;
    setOfferIdx(k);
    setTime(null);
    setGuests((g) => Math.min(Math.max(g, o.minGuests), o.maxGuests ?? 200));
  }

  const needAddr = offer.mode === "home" || offer.mode === "delivery";
  const estimate = offer.priceModel === "quote" || offer.price == null ? null : offer.price * guests;
  const ready = Boolean(day && time && name.trim() && email.trim() && phone.trim() && (!needAddr || address.trim()));
  const cta = !day ? "Escolha um dia" : !time ? "Escolha a hora" : !ready ? "Complete os seus dados" : "Pedir reserva";
  const first = firstName(chef.name);

  function submit() {
    if (!ready || !day || !time) return;
    setError(null);
    start(async () => {
      const r = await requestBooking({
        offerId: offer.id,
        date: day,
        time,
        guests,
        name,
        email,
        phone,
        address: needAddr ? address : undefined,
        lat: needAddr ? place?.lat : undefined,
        lng: needAddr ? place?.lng : undefined,
        notes: notes || undefined,
      });
      if (r.ok) setSent({ ref: r.ref, link: r.link });
      else setError(r.error);
    });
  }

  if (sent) {
    return (
      <div className="al-in flex flex-col gap-5 px-[30px] py-11">
        <svg className="al-check" width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="30" stroke="#111110" strokeWidth="1.5" />
          <path d="M20 33l8 8 16-18" stroke="#111110" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="d m-0 text-[40px] leading-[1.04]">Pedido enviado a {first}</h2>
        <p className="m-0 text-muted">
          {first} tem 48 horas para aceitar, recusar ou propor outra data. Enviámos um link para {email} para acompanhar tudo.
        </p>
        <dl className="m-0 flex flex-col border-t border-ink text-[15px]">
          {[
            ["Pedido", sent.ref],
            ["Menu", offer.title],
            ["Onde", offer.mode === "pickup" ? `Levantamento em ${chef.area}` : address],
            ["Quando", `${dayLabel(day!)} · ${time}`],
            [unitTitle(offer), String(guests)],
            ["Estimativa", estimate == null ? "Sob orçamento" : euro(estimate)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line py-3 last:border-b-0">
              <dt className="lab text-muted">{k}</dt>
              <dd className="m-0 text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <Link href={sent.link} className="btn">
          Ver estado e conversar
        </Link>
        {onClose && (
          <button type="button" className="btn btn-o" onClick={onClose}>
            Voltar ao mapa
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {!embedded && (
        <div className="relative flex h-[200px] items-end p-[18px]" style={{ background: chef.cover ? undefined : toneFor(chef.id) }}>
          {chef.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chef.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="lab text-muted">Fotografia · {chef.offers[0]?.title}</span>
          )}
          <button type="button" className="ctl absolute right-3.5 top-3.5 !border-white" onClick={onClose} aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111110" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>
      )}

      <div className={`flex flex-col gap-7 ${embedded ? "" : "px-7 pt-[26px]"}`}>
        {!embedded && (
          <div className="flex flex-col gap-2.5">
            <span className="lab text-muted">
              {tierLabel(chef.tier, chef.isNew, chef.reviewCount, chef.rating)} · {chef.area}
            </span>
            <h2 className="d m-0 text-[40px] leading-none">{chef.name}</h2>
            <div className="flex flex-wrap gap-1.5">
              {chef.categories.map((k) => (
                <span key={k} className="lab rounded-[2px] border border-ink px-[9px] py-[5px]">
                  {k}
                </span>
              ))}
            </div>
            <span className="num text-sm text-muted">
              {rating(chef.rating, chef.reviewCount)}
              {chef.responseHours ? ` · responde em cerca de ${chef.responseHours} h` : ""}
            </span>
            {chef.bio && <p className="mt-1 mb-0 text-[15px] text-ink-2">{chef.bio}</p>}
            <Link href={`/chef/${chef.slug}`} className="self-start text-[13px] tracking-[.04em]">
              Ver perfil completo →
            </Link>
          </div>
        )}

        <div>
          <h3 className="lab m-0 mb-1 border-b border-ink pb-2.5">Menu</h3>
          {chef.offers.map((o, k) => (
            <button key={o.id} type="button" className="opt" aria-pressed={k === offerIdx} onClick={() => chooseOffer(k)}>
              <span className="flex gap-3">
                <span className="dot" />
                <span className="flex flex-col">
                  <span className="d text-[19px] leading-[1.2]">{o.title}</span>
                  <span className="text-[13px] text-muted">
                    {MODE_LABEL[o.mode]}
                    {o.description ? ` · ${o.description}` : ""}
                  </span>
                </span>
              </span>
              <span className="num whitespace-nowrap text-sm font-semibold">{offerPriceLabel(o)}</span>
            </button>
          ))}
        </div>

        <MonthCalendar
          year={ym.y}
          month={ym.m}
          calendar={calendar}
          selected={day}
          onSelect={setDay}
          canPrev={ym.y > now.getFullYear() || ym.m > now.getMonth()}
          onMonth={(d) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }))}
        />

        <div className="flex flex-col gap-3">
          <h3 className="lab m-0 border-b border-ink pb-2.5">Hora</h3>
          <div className="flex flex-wrap gap-1.5">
            {(offer.timeSlots.length ? offer.timeSlots : ["13:00", "20:00"]).map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={time === t} onClick={() => setTime(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-line pb-5">
          <h3 className="lab m-0">{unitTitle(offer)}</h3>
          <div className="flex items-center gap-4">
            <button type="button" className="ctl" aria-label="Menos" onClick={() => setGuests((g) => Math.max(offer.minGuests, g - 1))}>
              −
            </button>
            <span className="d num min-w-7 text-center text-2xl" aria-live="polite">
              {guests}
            </span>
            <button
              type="button"
              className="ctl"
              aria-label="Mais"
              onClick={() => setGuests((g) => Math.min(offer.maxGuests ?? 200, g + 1))}
            >
              +
            </button>
          </div>
        </div>

        {needAddr && (
          <div className="field lab">
            Morada
            <AddressSearch
              label="Morada"
              value={address}
              onChange={(v) => {
                setAddress(v);
                setPlace(null);
              }}
              onSelect={setPlace}
              placeholder="Rua, número, andar, código postal"
              inputClassName="w-full"
            />
            <span className="hint">
              {offer.mode === "home"
                ? `${first} desloca-se até ${chef.radiusKm} km de ${chef.area}.`
                : "A taxa de entrega é definida pelo chef."}
            </span>
          </div>
        )}
        {offer.mode === "pickup" && (
          <div className="flex flex-col gap-1 rounded-[2px] bg-paper px-4 py-3.5">
            <span className="lab">Levantamento</span>
            <span className="text-sm text-ink-3">
              Na cozinha de {chef.name}, em {chef.area}. A morada exata é enviada quando o pedido for aceite.
            </span>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3.5">
          <label className="field lab sm:col-span-2">
            Nome
            <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" />
          </label>
          <label className="field lab">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.pt" />
          </label>
          <label className="field lab">
            Telemóvel
            <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351" />
          </label>
        </div>
        <label className="field lab">
          Notas para o chef
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alergias, equipamento da cozinha, ocasião…"
          />
        </label>

        <div className={`sticky bottom-0 flex flex-col gap-3 border-t border-line bg-white pt-4 pb-[22px] ${embedded ? "" : "-mx-7 px-7"}`}>
          <div className="num flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">
              {offer.priceModel === "quote" || offer.price == null ? offer.title : `${euro(offer.price)} × ${guests}`}
            </span>
            <span className="d text-2xl">{estimate == null ? "Sob orçamento" : euro(estimate)}</span>
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}
          <button type="button" className="btn w-full" onClick={submit} disabled={!ready || pending}>
            {pending ? "A enviar…" : cta}
          </button>
          <span className="text-center text-xs text-muted">Ainda não paga nada · paga diretamente ao chef</span>
        </div>
      </div>
    </div>
  );
}
