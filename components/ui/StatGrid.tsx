type Props = { items: [label: string, value: string][]; size?: "md" | "lg" };

/** Hairline-separated row of key figures. */
export function StatGrid({ items, size = "lg" }: Props) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-px border border-line bg-line">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1 bg-white p-[22px]">
          <span className="lab text-muted">{label}</span>
          <span className={`d num ${size === "lg" ? "text-[40px]" : "text-[34px]"}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
