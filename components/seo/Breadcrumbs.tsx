import Link from "next/link";

export type Crumb = { name: string; href: string };

/** "Ao Lume › Chefs em Lisboa › Chef Ana": where you are, and the way back up. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Caminho" className="text-[14px] text-muted">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-ink-3">
                {c.name}
              </span>
            ) : (
              <Link href={c.href} className="text-muted no-underline hover:text-ink hover:underline">
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
