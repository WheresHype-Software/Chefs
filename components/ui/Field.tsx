import type { ReactNode } from "react";

type Props = { label: string; hint?: ReactNode; className?: string; required?: boolean; children: ReactNode };

/** Underlined form field: small caps label, the control, and an optional hint. */
export function Field({ label, hint, className = "", required = false, children }: Props) {
  return (
    <label className={`field lab ${className}`}>
      <span>
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}
