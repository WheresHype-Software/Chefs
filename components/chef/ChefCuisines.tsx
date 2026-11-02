import { ChefSection } from "@/components/chef/ChefSection";
import { SERVICE_LABEL } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

function Group({ title, items, strong }: { title: string; items: string[]; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-[14px] font-semibold text-muted">{title}</h3>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={title}>
        {items.map((item) => (
          <li
            key={item}
            className={`rounded-full px-3.5 py-1.5 text-[15px] ${strong ? "bg-cobalt-soft font-semibold text-cobalt-deep" : "border border-line-2 text-ink-3"}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What the chef cooks and how they serve it, each as its own group of tags (room for as many as they have). */
export function ChefCuisines({ chef }: { chef: ChefProfile }) {
  if (!chef.categories.length && !chef.services.length) return null;
  return (
    <ChefSection id="cozinha" icon="menu" title="O que cozinha" subtitle="Tipos de cozinha e como pode receber.">
      {chef.categories.length > 0 && <Group title="Tipos de cozinha" items={chef.categories} strong />}
      {chef.services.length > 0 && (
        <div className="border-t border-line pt-4">
          <Group title="Serviços" items={chef.services.map((s) => SERVICE_LABEL[s])} />
        </div>
      )}
    </ChefSection>
  );
}
