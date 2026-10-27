import type { ReactNode } from "react";

type Props = { label: string; hint?: ReactNode; className?: string; children: ReactNode };

/** Underlined form field: small caps label, the control, and an optional hint. */
export function Field({ label, hint, className = "", children }: Props) {
  return (
    <label className={`field lab ${className}`}>
      {label}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}
