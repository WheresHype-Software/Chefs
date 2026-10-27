import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Context shown under the title (date, reference, status). */
  meta?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

/** Page heading: the title leads, context and description follow it. */
export function PageHeader({ title, meta, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="d m-0 text-[clamp(30px,4vw,44px)] leading-[1.05]">{title}</h1>
        {meta && <span className="text-[15px] font-medium text-muted">{meta}</span>}
        {description && <p className="m-0 max-w-[62ch] text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
