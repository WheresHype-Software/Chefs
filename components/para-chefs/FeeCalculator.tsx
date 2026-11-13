"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { computeBookingMoney, toCents, toEuros } from "@/lib/money";
import { euro } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";

type Props = {
  commissionPercent: number;
  commissionMin: number;
  /** The signal a chef typically asks for; the sliders stay out of that decision. */
  depositPercent: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Counts from the old value to the new one, so a number that changes is seen changing. Reduced
 * motion simply arrives: the point is legibility, not the animation.
 */
function useCountUp(value: number, ms = 520): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 1ms rather than 0: the first frame lands on t = 1 without ever dividing by zero.
    const duration = reduce ? 1 : ms;
    const start = performance.now();
    const origin = from.current;
    const run = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // fast first, settles gently
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame.current = requestAnimationFrame(run);
      else from.current = value;
    };
    frame.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame.current);
  }, [value, ms]);

  return shown;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] text-ink-3">{label}</span>
        <span className="d num text-[20px] leading-none">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="fee-range"
        aria-label={label}
      />
    </label>
  );
}

/**
 * What a chef takes home, with their own numbers in it.
 *
 * The year total leads, because that is the figure that decides whether this is worth their time;
 * the per-dinner arithmetic sits under it for anyone who wants to check. The share bar does the
 * work a percentage cannot: 5% is an abstraction, a sliver of a bar next to the chef's own block
 * is not. Nothing here is a claim — every number comes from the sliders and from the commission
 * actually configured.
 */
export function FeeCalculator({ commissionPercent, commissionMin, depositPercent }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations("paraChefs.calculator");
  const money = (n: number) => euro(round2(n), locale);
  const [price, setPrice] = useState(55);
  const [guests, setGuests] = useState(6);
  const [perMonth, setPerMonth] = useState(4);

  const total = price * guests;
  const m = computeBookingMoney(
    { valueCents: toCents(total), depositPercent },
    { commissionPercent, commissionMinCents: toCents(commissionMin), depositMarginPercent: 0 },
  );
  const commission = toEuros(m.commissionCents);
  const keeps = round2(total - commission);
  const deposit = toEuros(m.depositCents);
  const perYear = round2(keeps * perMonth * 12);
  const keptShare = total > 0 ? Math.max(0, Math.min(100, (keeps / total) * 100)) : 100;

  const shownYear = useCountUp(perYear);
  const shownKeeps = useCountUp(keeps);
  const shownCommission = useCountUp(commission);

  return (
    <div className="box flex min-w-0 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4">
        <Slider label={t("pricePerPerson")} value={price} min={15} max={150} step={5} suffix=" €" onChange={setPrice} />
        <Slider label={t("guests")} value={guests} min={2} max={20} step={1} suffix="" onChange={setGuests} />
        <Slider label={t("perMonth")} value={perMonth} min={1} max={20} step={1} suffix="" onChange={setPerMonth} />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-6">
        <span className="lab text-muted">{t("yearLabel")}</span>
        <span className="d num text-[clamp(40px,8vw,64px)] leading-none text-cobalt">{money(round2(shownYear))}</span>
        <span className="text-[15px] text-muted">{t("yearDetail", { count: perMonth, amount: money(total) })}</span>
      </div>

      {/* The share bar: what a percentage cannot say on its own. */}
      <div className="flex flex-col gap-2">
        <div className="flex h-3 overflow-hidden bg-line" role="presentation">
          <div className="bg-cobalt transition-[width] duration-500 ease-out" style={{ width: `${keptShare}%` }} />
          <div className="flex-1 bg-yolk" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[14px]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 bg-cobalt" />
            {t.rich("keeps", { amount: money(shownKeeps), b: (c) => <strong className="num">{c}</strong> })}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span aria-hidden="true" className="h-2.5 w-2.5 bg-yolk" />
            {t.rich("aoLume", { amount: money(shownCommission), b: (c) => <strong className="num">{c}</strong> })}
          </span>
        </div>
      </div>

      <p className="m-0 bg-paper p-3.5 text-[14px] leading-relaxed text-ink-3">
        {t.rich("depositNote", {
          deposit: money(deposit),
          rest: money(total - deposit),
          b: (c) => <strong className="num text-ink">{c}</strong>,
        })}
      </p>

      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-[14px] text-muted">
        {(["noMonthly", "noPerRequest", "payWhenPaid"] as const).map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cobalt">
              <path d="M5 12.5 10 17 19 7" />
            </svg>
            {t(`points.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
