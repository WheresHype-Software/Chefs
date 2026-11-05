"use client";

import { useEffect, useRef, useState } from "react";
import { computeBookingMoney, toCents, toEuros } from "@/lib/money";

type Props = {
  commissionPercent: number;
  commissionMin: number;
  /** The signal a chef typically asks for; the slider stays out of this decision. */
  depositPercent: number;
};

const money = (n: number) => `${(Number.isInteger(n) ? String(n) : n.toFixed(2)).replace(".", ",")} €`;

/**
 * Counts from the old value to the new one, so a number that changes is seen changing. Honours
 * prefers-reduced-motion by simply arriving: the point is legibility, not the animation.
 */
function useCountUp(value: number, ms = 420): number {
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
      // easeOutCubic: fast first, settles gently, so the eye lands on the final figure.
      const eased = 1 - (1 - t) ** 3;
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
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium text-ink-3">{label}</span>
        <span className="d num text-[22px] leading-none text-ink">
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
 * What a chef actually takes home, with their own numbers in it.
 *
 * A percentage is abstract; "num jantar de 330 € fica com 290,40 €" is not. The figures animate
 * because a number that moves when you move the slider is read as a calculation, not a claim, and
 * the whole point is that the chef should trust the arithmetic enough to stop worrying about it.
 */
export function FeeCalculator({ commissionPercent, commissionMin, depositPercent }: Props) {
  const [price, setPrice] = useState(55);
  const [guests, setGuests] = useState(6);

  const total = price * guests;
  const m = computeBookingMoney(
    { valueCents: toCents(total), depositPercent },
    { commissionPercent, commissionMinCents: toCents(commissionMin), depositMarginPercent: 0 },
  );
  const commission = toEuros(m.commissionCents);
  const keeps = toEuros(toCents(total) - m.commissionCents);
  const deposit = toEuros(m.depositCents);

  const shownKeeps = useCountUp(keeps);
  const shownCommission = useCountUp(commission);
  const shownDeposit = useCountUp(deposit);

  return (
    <div className="box flex min-w-0 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <span className="lab text-muted">Faça as contas</span>
        <h3 className="d m-0 text-[26px] leading-tight">Quanto fica para si?</h3>
      </div>

      <div className="flex flex-col gap-5">
        <Slider label="Cobra por pessoa" value={price} min={15} max={150} step={5} suffix=" €" onChange={setPrice} />
        <Slider label="Pessoas à mesa" value={guests} min={2} max={20} step={1} suffix="" onChange={setGuests} />
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <div className="flex items-end justify-between gap-4">
          <span className="text-[15px] text-ink-3">Fica para si</span>
          <span className="d num text-[clamp(34px,6vw,52px)] leading-none text-cobalt">{money(Math.round(shownKeeps * 100) / 100)}</span>
        </div>
        <dl className="m-0 flex flex-col gap-1.5 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="m-0 text-muted">Jantar de {guests} pessoas</dt>
            <dd className="num m-0">{money(total)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="m-0 text-muted">Comissão Ao Lume ({String(commissionPercent).replace(".", ",")}%)</dt>
            <dd className="num m-0">−{money(Math.round(shownCommission * 100) / 100)}</dd>
          </div>
        </dl>
      </div>

      <p className="m-0 bg-yolk-soft p-3.5 text-[14px] leading-relaxed text-ink">
        O cliente paga <strong className="num">{money(Math.round(shownDeposit * 100) / 100)}</strong> de sinal aqui para confirmar a data.
        Descontamos a comissão a esse sinal e entregamos-lhe o resto. Os outros{" "}
        <strong className="num">{money(Math.round((total - deposit) * 100) / 100)}</strong> combina-os consigo, como sempre.
      </p>

      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-[14px] text-muted">
        {["Sem mensalidade", "Sem custo por pedido", "Só paga quando recebe"].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cobalt">
              <path d="M5 12.5 10 17 19 7" />
            </svg>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
