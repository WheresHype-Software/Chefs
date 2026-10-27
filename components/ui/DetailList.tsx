import type { ReactNode } from "react";

export type DetailRow = [label: string, value: ReactNode];

/** Falsy entries are skipped, so optional rows can be written inline (`cond && [label, value]`). */
type Props = { items: (DetailRow | false | null | undefined | "" | 0)[]; variant?: "plain" | "ruled" };

/**
 * Label/value rows. "plain" for detail cards, "ruled" for summaries with
 * small caps labels and hairlines between rows.
 */
export function DetailList({ items: all, variant = "plain" }: Props) {
  const items = all.filter((row): row is DetailRow => Boolean(row));
  if (variant === "ruled") {
    return (
      <dl className="m-0 flex flex-col border-t border-ink text-[15px]">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-line py-3 last:border-b-0">
            <dt className="lab text-muted">{label}</dt>
            <dd className="m-0 text-right">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="m-0 flex flex-col gap-3 text-[15px]">
      {items.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className="m-0 text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
