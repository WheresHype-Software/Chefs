type Props = { value: number; min: number; max: number; onChange: (value: number) => void };

/** − value + counter with 44 px targets. */
export function Stepper({ value, min, max, onChange }: Props) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" className="ctl" aria-label="Menos" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="d num min-w-7 text-center text-2xl" aria-live="polite">
        {value}
      </span>
      <button type="button" className="ctl" aria-label="Mais" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}
