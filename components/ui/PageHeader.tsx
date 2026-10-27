import type { ReactNode } from "react";

type Props = { eyebrow: string; title: string; description?: ReactNode; actions?: ReactNode };

/** Dashboard page heading: small caps eyebrow, display title, optional text and actions. */
export function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="lab text-muted">{eyebrow}</span>
        <h1 className="d m-0 text-[clamp(34px,5vw,52px)] leading-none">{title}</h1>
        {description && <p className="m-0 max-w-[600px] text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
