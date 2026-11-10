import type { ReactNode } from "react";
import { LumiSlot } from "@/components/dashboard/LumiCoach";

type Props = {
  label: string;
  hint?: ReactNode;
  className?: string;
  required?: boolean;
  /** Anchor for Lumi's onboarding tips (`data-lumi`). */
  lumi?: string;
  children: ReactNode;
};

/** Underlined form field: small caps label, the control, and an optional hint. */
export function Field({ label, hint, className = "", required = false, lumi, children }: Props) {
  const field = (
    <label className={`field lab ${className}`} data-lumi={lumi}>
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
  return lumi ? (
    <>
      <LumiSlot name={lumi} />
      {field}
    </>
  ) : (
    field
  );
}
